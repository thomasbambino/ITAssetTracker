import { Router, Request, Response } from 'express';
import { LoginCredentials, changePasswordSchema } from '@shared/schema';
import { loginUser, changeUserPassword, resetUserPassword, isAdmin, isAuthenticated, hashPassword } from './auth';
import { storage } from './storage';
import { z } from 'zod';

const router = Router();

// Login route
router.post('/login', async (req: Request, res: Response) => {
  try {
    const credentials = req.body as LoginCredentials;
    const result = await loginUser(credentials);

    if (result.success) {
      if (result.requiresTwoFactor) {
        // Store user ID temporarily for 2FA verification
        const user = await storage.getUserByEmail(credentials.email);
        if (user) {
          req.session.pendingTwoFactorUserId = user.id;
        }
        
        return res.status(200).json({
          success: true,
          requiresTwoFactor: true,
          message: result.message,
          passwordResetRequired: result.passwordResetRequired
        });
      } else if (result.user) {
        // Store user info in session for completed login
        req.session.userId = result.user.id;
        req.session.userRole = (result.user.role || 'user') as 'user' | 'admin';
        req.session.passwordResetRequired = Boolean(result.passwordResetRequired);
        
        // Check if user has 2FA enabled, if not, create a security notification
        if (!result.user.twoFactorEnabled) {
          try {
            const existingNotifications = await storage.getNotifications(result.user.id, 10);
            const has2FANotification = existingNotifications.some(notification => 
              notification.type === 'security_2fa' && !notification.isRead
            );
            
            if (!has2FANotification) {
              await storage.createNotification({
                userId: result.user.id,
                type: 'security_2fa',
                title: 'Secure Your Account with Two-Factor Authentication',
                message: 'Protect your account by enabling two-factor authentication (2FA). This adds an extra layer of security to prevent unauthorized access. Go to Settings > Security to enable 2FA.',
                isRead: false,
                relatedId: null,
                relatedType: 'security'
              });
            }
          } catch (error) {
            console.error('Error creating 2FA notification for user:', error);
          }
        }
        
        // Don't send password-related fields to the client
        const { 
          passwordHash, 
          passwordSalt, 
          tempPassword, 
          tempPasswordExpiry, 
          twoFactorSecret,
          twoFactorBackupCodes,
          ...safeUserData 
        } = result.user;
        
        return res.status(200).json({
          success: true,
          user: safeUserData,
          passwordResetRequired: result.passwordResetRequired
        });
      }
    }
    
    return res.status(401).json({
      success: false,
      message: result.message || 'Invalid credentials'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
});

// Logout route
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'An error occurred during logout'
      });
    }
    
    res.clearCookie('connect.sid');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Get current user
router.get('/me', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Don't send password-related fields to the client
    const { 
      passwordHash, 
      passwordSalt, 
      tempPassword, 
      tempPasswordExpiry, 
      ...safeUserData 
    } = user;
    
    // Add password reset status from session
    const userData = {
      ...safeUserData,
      passwordResetRequired: req.session.passwordResetRequired
    };
    
    return res.status(200).json(userData);
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving user data'
    });
  }
});

// Change password
router.post('/change-password', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validated = changePasswordSchema.safeParse(req.body);
    
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validated.error.format()
      });
    }
    
    const userId = req.session.userId;
    const { currentPassword, newPassword } = validated.data;
    
    const result = await changeUserPassword(userId, currentPassword, newPassword);
    
    if (result.success) {
      // Update session to remove password reset flag
      req.session.passwordResetRequired = false;
      
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while changing password'
    });
  }
});



// Reset user's password (admin only)
router.post('/reset-password/:userId', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    const result = await resetUserPassword(userId, req.session.userId);
    
    if (result.success) {
      // Create a response with the temp password and email status
      const response: any = {
        success: true,
        message: 'Password reset successfully',
        tempPassword: result.tempPassword
      };
      
      // Add email notification status if available
      if (result.emailSent !== undefined) {
        response.emailSent = result.emailSent;
        response.emailMessage = result.emailSent 
          ? 'Email notification sent successfully' 
          : 'Failed to send email notification';
          
        if (!result.emailSent && result.emailError) {
          response.emailError = result.emailError;
        }
      }
      
      // Activity log is already created in resetUserPassword function
      
      return res.status(200).json(response);
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while resetting password'
    });
  }
});

export default router;