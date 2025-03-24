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
    console.log('Attempting login for:', credentials.email);
    
    const result = await loginUser(credentials);

    if (result.success && result.user) {
      // Store user info in session
      req.session.userId = result.user.id;
      req.session.userRole = result.user.role;
      req.session.passwordResetRequired = result.passwordResetRequired;
      
      // Save the session to ensure the session store is updated immediately
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      // Log session after saving
      console.log('Login successful - Session created:', {
        id: req.sessionID,
        userId: req.session.userId,
        userRole: req.session.userRole,
        cookie: req.session.cookie
      });
      
      // Don't send password-related fields to the client
      const { 
        passwordHash, 
        passwordSalt, 
        tempPassword, 
        tempPasswordExpiry, 
        ...safeUserData 
      } = result.user;
      
      return res.status(200).json({
        success: true,
        user: {
          ...safeUserData,
          passwordResetRequired: result.passwordResetRequired
        },
        passwordResetRequired: result.passwordResetRequired,
        sessionId: req.sessionID // Return the session ID for debugging
      });
    } else {
      return res.status(401).json({
        success: false,
        message: result.message || 'Invalid credentials'
      });
    }
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
  console.log('Logout request received - destroying session:', req.sessionID);
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'An error occurred during logout'
      });
    }
    
    // Clear both cookie names to be safe
    res.clearCookie('asset.sid');
    res.clearCookie('connect.sid');
    
    console.log('Session destroyed successfully');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Get current user
router.get('/me', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Log session information for debugging
    console.log('GET /me - Session:', {
      id: req.sessionID,
      userId: req.session.userId,
      userRole: req.session.userRole,
      cookie: req.session.cookie
    });
    
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required - No userId in session'
      });
    }
    
    const user = await storage.getUserById(userId);
    
    if (!user) {
      console.error(`User with ID ${userId} from session not found in database`);
      // Clear the invalid session
      req.session.destroy((err) => {
        if (err) console.error('Error destroying invalid session:', err);
      });
      
      return res.status(401).json({
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
    
    console.log('GET /me - Returning user data for:', user.email);
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
    
    const result = await resetUserPassword(userId);
    
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
      
      // Add activity log
      await storage.createActivityLog({
        actionType: 'PASSWORD_RESET',
        userId: req.session.userId || null,
        details: `Password reset for user ID: ${userId}`
      });
      
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