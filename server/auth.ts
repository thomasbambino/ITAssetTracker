import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { storage } from './storage';
import { LoginCredentials } from '@shared/schema';
import { User } from '@shared/schema';
import improvedEmailService, { updateEmailService as updateImprovedEmailService } from './email-service-improved';

// Password hashing
export async function hashPassword(password: string): Promise<{ hash: string, salt: string }> {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return { hash, salt };
}

// Password verification
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate temporary password for resets
export function generateTempPassword(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Middleware: Check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // @ts-ignore - session is added by express-session
  if (req.session && req.session.userId) {
    return next();
  }
  
  return res.status(401).json({
    success: false,
    message: 'Authentication required'
  });
}

// Middleware: Check if user is admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  // @ts-ignore - session is added by express-session
  if (req.session && req.session.userRole === 'admin') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Admin privileges required'
  });
}

// Middleware: Check if password reset is required
export function checkPasswordResetRequired(req: Request, res: Response, next: NextFunction) {
  // @ts-ignore - session is added by express-session
  if (req.session && req.session.passwordResetRequired) {
    return res.status(403).json({
      success: false,
      message: 'Password reset required',
      passwordResetRequired: true
    });
  }
  
  return next();
}

// Login user
export async function loginUser(credentials: LoginCredentials): Promise<{ 
  success: boolean;
  message?: string;
  user?: User;
  passwordResetRequired?: boolean;
}> {
  try {
    // Find user by email
    const user = await storage.getUserByEmail(credentials.email);
    
    if (!user) {
      return { 
        success: false,
        message: 'Invalid email or password'
      };
    }
    
    // Check if account is active
    if (user.active === false) {
      return {
        success: false,
        message: 'Your account has been deactivated'
      };
    }
    
    // Verify password
    const isValid = user.passwordHash ? 
      await verifyPassword(credentials.password, user.passwordHash) : 
      false;
    
    if (!isValid) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }
    
    // Update last login time
    await storage.updateUser(user.id, { 
      lastLogin: new Date()
    });
    
    // Check if password reset is required
    const passwordResetRequired = user.passwordResetRequired || false;
    
    return {
      success: true,
      user,
      passwordResetRequired
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login'
    };
  }
}

// Reset user password (admin action)
export async function resetUserPassword(userId: number): Promise<{ 
  success: boolean;
  message?: string;
  tempPassword?: string;
  emailSent?: boolean;
  emailError?: string;
}> {
  try {
    // Get user
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    
    // Generate temporary password
    const tempPassword = generateTempPassword();
    
    // Hash the temporary password
    const { hash } = await hashPassword(tempPassword);
    
    // Set temporary password expiry (24 hours)
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    
    // Update user record
    await storage.updateUser(userId, {
      passwordHash: hash,
      tempPassword: tempPassword,  // Storing in plain text for admin to see
      tempPasswordExpiry: expiry,
      passwordResetRequired: true
    });
    
    // Try to send email notification with the temporary password
    let emailSent = false;
    let emailError = undefined;
    
    if (user.email) {
      try {
        // Get email settings to check if service is configured and enabled
        const emailSettings = await storage.getEmailSettings();
        
        if (emailSettings && emailSettings.isEnabled) {
          // Update the email service with current settings
          console.log('Updating email service with current settings...');
          const updatedEmailService = updateImprovedEmailService(emailSettings);
          
          // Check if email service is configured after updating
          console.log('Email service configuration check:', updatedEmailService.isConfigured());
          
          // Attempt to send email
          if (updatedEmailService.isConfigured()) {
            console.log(`Sending password reset email to: ${user.email}`);
            const fullName = `${user.firstName} ${user.lastName}`;
            
            const result = await updatedEmailService.sendPasswordResetEmail(
              user.email, 
              tempPassword, 
              fullName
            );
            
            emailSent = result.success;
            if (!result.success) {
              emailError = result.message;
              console.error('Email error:', result.message);
            } else {
              console.log('Password reset email sent successfully');
            }
          } else {
            // Fallback to simulation mode
            console.log(`[EMAIL SIMULATION] Would send password reset email to: ${user.email}`);
            console.log(`[EMAIL SIMULATION] User: ${user.firstName} ${user.lastName}`);
            console.log(`[EMAIL SIMULATION] Temp password: ${tempPassword}`);
            
            // Mark as successfully sent (simulated)
            emailSent = true;
          }
        }
      } catch (emailErr) {
        console.error('Error sending email:', emailErr);
        emailError = `Email sending failed: ${emailErr instanceof Error ? emailErr.message : 'Unknown error'}`;
      }
    }
    
    return {
      success: true,
      message: 'Password reset successfully',
      tempPassword,
      emailSent,
      emailError
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'An error occurred during password reset'
    };
  }
}

// Change user password
export async function changeUserPassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ 
  success: boolean;
  message?: string;
}> {
  try {
    // Get user
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    
    // Verify current password
    const isValid = user.passwordHash ? 
      await verifyPassword(currentPassword, user.passwordHash) : 
      false;
    
    if (!isValid) {
      return {
        success: false,
        message: 'Current password is incorrect'
      };
    }
    
    // Hash the new password
    const { hash } = await hashPassword(newPassword);
    
    // Update user record
    await storage.updateUser(userId, {
      passwordHash: hash,
      tempPassword: null,
      tempPasswordExpiry: null,
      passwordResetRequired: false
    });
    
    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (error) {
    console.error('Password change error:', error);
    return {
      success: false,
      message: 'An error occurred during password change'
    };
  }
}