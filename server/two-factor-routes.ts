import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { isAuthenticated, AuthenticatedRequest } from './auth';
import { TwoFactorService } from './two-factor-service';
import { z } from 'zod';

const router = Router();

// Schema for 2FA setup verification
const setup2FASchema = z.object({
  token: z.string().length(6, 'Token must be 6 digits'),
});

// Schema for 2FA verification during login
const verify2FASchema = z.object({
  token: z.string().min(6, 'Token must be at least 6 characters'),
  isBackupCode: z.boolean().optional()
});

// Schema for disabling 2FA
const disable2FASchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
});

/**
 * GET /api/2fa/setup
 * Generate a new 2FA secret and QR code for setup
 */
router.get('/setup', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled for this account'
      });
    }

    // Get branding settings for company name
    const branding = await storage.getBrandingSettings();
    const companyName = branding?.companyName || 'Connecta';

    // Generate secret and QR code
    const { secret, otpauthUrl } = TwoFactorService.generateSecret(
      user.email, 
      companyName
    );
    
    // Store the secret temporarily in the user record for verification
    // We'll use a temporary field that gets cleared after successful setup
    console.log('Storing secret during setup:');
    console.log('- User ID:', user.id);
    console.log('- Secret to store:', secret ? 'EXISTS' : 'MISSING');
    
    const updateResult = await storage.updateUser(
      user.id,
      { twoFactorSecret: secret }, // Temporarily store the secret
      user.id,
      true // Skip activity log
    );
    
    console.log('- Update result:', updateResult ? 'SUCCESS' : 'FAILED');
    
    // Verify the secret was stored
    const verifyUser = await storage.getUserById(user.id);
    console.log('- Verification - secret stored:', verifyUser?.twoFactorSecret ? 'EXISTS' : 'MISSING');
    
    const qrCodeDataUrl = await TwoFactorService.generateQRCode(otpauthUrl);

    res.json({
      success: true,
      data: {
        secret,
        qrCodeDataUrl,
        manualEntryKey: secret,
        issuer: companyName
      }
    });

  } catch (error) {
    console.error('Error in 2FA setup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup 2FA'
    });
  }
});

/**
 * POST /api/2fa/verify-setup
 * Verify the setup token and enable 2FA
 */
router.post('/verify-setup', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('=== 2FA VERIFY-SETUP ROUTE START ===');
    console.log('- Request body:', req.body);
    
    const user = req.user;
    if (!user) {
      console.log('- ERROR: No user in request');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    console.log('- User ID:', user.id);
    console.log('- User email:', user.email);

    // Validate request body
    const validation = setup2FASchema.safeParse(req.body);
    if (!validation.success) {
      console.log('- VALIDATION ERROR:', validation.error.errors);
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0].message
      });
    }

    const { token } = validation.data;
    console.log('- Validation passed, token received:', token);

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled for this account'
      });
    }

    // Get the secret from the user's database record (stored during setup)
    console.log('2FA Verify-Setup Debug:');
    const currentUser = await storage.getUserById(user.id);
    
    if (!currentUser || !currentUser.twoFactorSecret) {
      console.log('- ERROR: No secret found in user record');
      return res.status(400).json({
        success: false,
        message: 'No 2FA setup found. Please start the setup process again.'
      });
    }
    
    const secret = currentUser.twoFactorSecret;
    console.log('- Retrieved secret from user record:', secret ? 'EXISTS' : 'MISSING');

    console.log('- Token from request:', token);
    console.log('- Secret length:', secret.length);

    // Verify the token
    const isValidToken = TwoFactorService.verifyToken(token, secret);
    console.log('- Verification result:', isValidToken);
    
    if (!isValidToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });
    }

    // Generate backup codes
    const backupCodes = TwoFactorService.generateBackupCodes();

    // Enable 2FA for the user
    const updatedUser = await storage.updateUser(
      user.id,
      {
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(backupCodes)
      },
      user.id,
      true // Skip activity log for security
    );

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Failed to enable 2FA'
      });
    }

    // Clean up the temporary secret from session
    delete (req.session as any).tempTwoFactorSecret;

    res.json({
      success: true,
      message: '2FA has been successfully enabled',
      data: {
        backupCodes
      }
    });

  } catch (error) {
    console.error('Error verifying 2FA setup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify 2FA setup'
    });
  }
});

/**
 * POST /api/2fa/verify
 * Verify 2FA token during login process
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    // This endpoint is used during login, so user might not be fully authenticated yet
    // We'll need to check session for pending 2FA verification
    const userId = req.session.pendingTwoFactorUserId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'No pending 2FA verification found'
      });
    }

    // Validate request body
    const validation = verify2FASchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0].message
      });
    }

    const { token, isBackupCode = false } = validation.data;

    // Get user data
    const user = await storage.getUserById(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA configuration'
      });
    }

    let isValid = false;
    let shouldUpdateUser = false;
    let updatedBackupCodes = null;

    if (isBackupCode) {
      // Verify backup code
      const backupCodes = user.twoFactorBackupCodes 
        ? JSON.parse(user.twoFactorBackupCodes) 
        : [];
      
      const backupResult = TwoFactorService.verifyBackupCode(token, backupCodes);
      isValid = backupResult.isValid;
      
      if (isValid) {
        updatedBackupCodes = backupResult.remainingCodes;
        shouldUpdateUser = true;
      }
    } else {
      // Verify TOTP token
      isValid = TwoFactorService.verifyToken(token, user.twoFactorSecret);
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: isBackupCode 
          ? 'Invalid backup code' 
          : 'Invalid verification code'
      });
    }

    // Update backup codes if a backup code was used
    if (shouldUpdateUser && updatedBackupCodes !== null) {
      await storage.updateUser(
        user.id,
        {
          twoFactorBackupCodes: JSON.stringify(updatedBackupCodes)
        },
        user.id,
        true // Skip activity log for security
      );
    }

    // Complete the login process
    req.session.userId = user.id;
    req.session.userRole = (user.role === 'admin' || user.role === 'user') ? user.role : 'user';
    req.session.passwordResetRequired = Boolean(user.passwordResetRequired);
    delete req.session.pendingTwoFactorUserId;

    // Update last login
    await storage.updateUserLastLogin(user.id, new Date());

    res.json({
      success: true,
      message: '2FA verification successful',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          department: user.department,
          passwordResetRequired: user.passwordResetRequired
        },
        backupCodesRemaining: updatedBackupCodes ? updatedBackupCodes.length : undefined
      }
    });

  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify 2FA'
    });
  }
});

/**
 * POST /api/2fa/disable
 * Disable 2FA for the current user
 */
router.post('/disable', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Validate request body
    const validation = disable2FASchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0].message
      });
    }

    const { currentPassword } = validation.data;

    // Verify current password
    const { verifyPassword } = await import('./auth');
    const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash || '');
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid current password'
      });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not currently enabled'
      });
    }

    // Disable 2FA
    const updatedUser = await storage.updateUser(
      user.id,
      {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: null
      },
      user.id,
      true // Skip activity log for security
    );

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Failed to disable 2FA'
      });
    }

    res.json({
      success: true,
      message: '2FA has been successfully disabled'
    });

  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA'
    });
  }
});

/**
 * GET /api/2fa/status
 * Get 2FA status for the current user
 */
router.get('/status', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    console.log('2FA Status Debug:');
    console.log('- User ID:', user.id);
    console.log('- Session user twoFactorEnabled:', user.twoFactorEnabled);
    
    // Get fresh user data from database to ensure we have the latest info
    const freshUser = await storage.getUserById(user.id);
    console.log('- Fresh user twoFactorEnabled:', freshUser?.twoFactorEnabled);
    
    if (!freshUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const backupCodes = freshUser.twoFactorBackupCodes 
      ? JSON.parse(freshUser.twoFactorBackupCodes) 
      : [];

    console.log('- Backup codes count:', backupCodes.length);
    console.log('- Final enabled status:', freshUser.twoFactorEnabled || false);

    res.json({
      success: true,
      data: {
        enabled: freshUser.twoFactorEnabled || false,
        backupCodesCount: backupCodes.length
      }
    });

  } catch (error) {
    console.error('Error getting 2FA status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get 2FA status'
    });
  }
});

/**
 * POST /api/2fa/regenerate-backup-codes
 * Generate new backup codes
 */
router.post('/regenerate-backup-codes', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA must be enabled to generate backup codes'
      });
    }

    // Generate new backup codes
    const backupCodes = TwoFactorService.generateBackupCodes();

    // Update user with new backup codes
    const updatedUser = await storage.updateUser(
      user.id,
      {
        twoFactorBackupCodes: JSON.stringify(backupCodes)
      },
      user.id,
      true // Skip activity log for security
    );

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Failed to regenerate backup codes'
      });
    }

    res.json({
      success: true,
      message: 'New backup codes generated successfully',
      data: {
        backupCodes
      }
    });

  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate backup codes'
    });
  }
});

export default router;