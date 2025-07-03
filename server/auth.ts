import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { storage } from './storage';
import { LoginCredentials } from '@shared/schema';
import { User } from '@shared/schema';
import directMailgun, { updateMailgunService, DirectMailgunService } from './direct-mailgun';

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

// Extended Request interface to include user property
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Middleware: Check if user is authenticated and attach user to request
export async function isAuthenticated(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // @ts-ignore - session is added by express-session
    if (req.session && req.session.userId) {
      // Load user data and attach to request
      const user = await storage.getUserById(req.session.userId);
      if (user) {
        req.user = user;
        return next();
      }
    }
    
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
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
  requiresTwoFactor?: boolean;
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
    
    // Check if 2FA is enabled for this user
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Don't update last login yet - wait for 2FA verification
      // Check if password reset is required
      const passwordResetRequired = user.passwordResetRequired || false;
      
      return {
        success: true,
        requiresTwoFactor: true,
        passwordResetRequired,
        message: '2FA verification required'
      };
    }
    
    // Update last login time without creating activity log entry
    await storage.updateUserLastLogin(user.id, new Date());
    
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
export async function resetUserPassword(userId: number, loggedInUserId?: number): Promise<{ 
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
    
    // Update user record without logging generic "user updated" activity
    await storage.updateUser(userId, {
      passwordHash: hash,
      tempPassword: tempPassword,  // Storing in plain text for admin to see
      tempPasswordExpiry: expiry,
      passwordResetRequired: true
    }, 1, true); // Skip activity log since we'll log a specific password reset activity

    // Log password reset activity
    await storage.createActivityLog({
      userId: loggedInUserId || 1, // Use logged-in user ID if provided, otherwise default to admin
      actionType: 'password_reset',
      details: `Password reset for user: ${user.firstName} ${user.lastName}`
    });
    
    // Try to send email notification with the temporary password
    let emailSent = false;
    let emailError = undefined;
    
    if (user.email) {
      try {
        // Get email settings to check if service is configured and enabled
        const emailSettings = await storage.getEmailSettings();
        
        // Check if we have valid database settings first
        if (emailSettings && emailSettings.isEnabled) {
          // Update the direct mailgun service with current settings from database
          console.log('Updating direct mailgun service with database settings...');
          const updatedMailgunService = updateMailgunService(emailSettings);
          
          // Check if direct mailgun service is configured after updating
          const dbConfigured = updatedMailgunService.isConfigured();
          console.log('Database-based mailgun service configuration check:', dbConfigured);
          
          // Attempt to send email using our direct implementation with database settings
          if (dbConfigured) {
            console.log(`Sending password reset email to: ${user.email} using database settings`);
            const fullName = `${user.firstName} ${user.lastName}`;
            
            const result = await updatedMailgunService.sendPasswordResetEmail(
              user.email, 
              tempPassword, 
              fullName
            );
            
            emailSent = result.success;
            if (!result.success) {
              emailError = result.message;
              console.error('Email error with database settings:', result.message);
              
              // Try with environment variables if database settings failed
              console.log('Attempting to use environment variables instead...');
            } else {
              console.log('Password reset email sent successfully using database settings');
              return {
                success: true,
                message: 'Password reset successfully',
                tempPassword,
                emailSent,
                emailError
              };
            }
          }
        }
        
        // If we reach here, either database settings failed or weren't available
        // Try using environment variables directly as a fallback
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        
        if (apiKey && domain) {
          console.log('Trying to send email using environment variables...');
          
          // Try to get company name from branding settings
          let companyName = 'AssetTrack';
          try {
            const branding = await storage.getBrandingSettings();
            if (branding && branding.companyName) {
              companyName = branding.companyName;
            }
          } catch (err) {
            console.error('Error getting branding settings for email fallback:', err);
          }
          
          // Create direct settings from environment variables
          const envEmailSettings = {
            apiKey,
            domain,
            fromEmail: `noreply@${domain}`,
            fromName: `${companyName} System`,
            isEnabled: true
          };
          
          // Create a temporary service instance with env settings
          const envMailgunService = new DirectMailgunService(envEmailSettings);
          
          // Check if this service is configured
          const envConfigured = envMailgunService.isConfigured();
          console.log('Environment-based mailgun service configuration check:', envConfigured);
          
          if (envConfigured) {
            console.log(`Sending password reset email to: ${user.email} using environment variables`);
            const fullName = `${user.firstName} ${user.lastName}`;
            
            const result = await envMailgunService.sendPasswordResetEmail(
              user.email,
              tempPassword,
              fullName
            );
            
            emailSent = result.success;
            if (!result.success) {
              emailError = `${emailError ? emailError + '; ' : ''}${result.message}`;
              console.error('Email error with environment variables:', result.message);
            } else {
              console.log('Password reset email sent successfully using environment variables');
            }
          }
        }
        
        // If neither database nor environment variables worked, use simulation
        if (!emailSent) {
          console.log(`[EMAIL SIMULATION] Would send password reset email to: ${user.email}`);
          console.log(`[EMAIL SIMULATION] User: ${user.firstName} ${user.lastName}`);
          console.log(`[EMAIL SIMULATION] Temp password: ${tempPassword}`);
          
          // Mark as successfully sent (simulated)
          emailSent = true;
          emailError = emailError ? `${emailError} - Fall back to simulation mode` : 'Using simulation mode';
        }
      } catch (emailErr) {
        console.error('Error in email sending process:', emailErr);
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