import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { LoginCredentials, User } from '@shared/schema';
import { storage } from './storage';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

// Function to hash a password
export async function hashPassword(password: string): Promise<{ hash: string, salt: string }> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(password, salt);
  return { hash, salt };
}

// Function to verify a password against a hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Function to generate a random password
export function generateTempPassword(length: number = 8): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  
  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);
  
  // Convert random bytes to password characters
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % charset.length;
    password += charset[randomIndex];
  }
  
  return password;
}

// Authentication middleware
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
}

// Admin role middleware
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userRole === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden: Admin access required' });
}

// Reset password required middleware
export function checkPasswordResetRequired(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.passwordResetRequired) {
    return res.status(403).json({ 
      message: 'Password reset required',
      resetRequired: true 
    });
  }
  next();
}

// Login user
export async function loginUser(credentials: LoginCredentials): Promise<{ 
  success: boolean, 
  user?: User, 
  message?: string,
  passwordResetRequired?: boolean 
}> {
  try {
    const user = await storage.getUserByEmail(credentials.email);
    
    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    if (!user.active) {
      return { success: false, message: 'Your account is not active. Please contact an administrator.' };
    }
    
    // Check for temp password first
    if (user.tempPassword && user.tempPasswordExpiry) {
      const tempPasswordExpiry = new Date(user.tempPasswordExpiry);
      const now = new Date();
      
      if (now < tempPasswordExpiry && credentials.password === user.tempPassword) {
        // Update last login
        await storage.updateUser(user.id, { lastLogin: new Date() });
        
        return { 
          success: true, 
          user, 
          passwordResetRequired: true 
        };
      }
    }
    
    // Check regular password
    if (!user.passwordHash) {
      return { success: false, message: 'No password set. Please contact an administrator.' };
    }
    
    const isValid = await verifyPassword(credentials.password, user.passwordHash);
    
    if (!isValid) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    // Update last login
    await storage.updateUser(user.id, { lastLogin: new Date() });
    
    return { 
      success: true, 
      user, 
      passwordResetRequired: user.passwordResetRequired 
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'An error occurred during login' };
  }
}

// Reset a user's password and generate a temporary one
export async function resetUserPassword(userId: number): Promise<{ 
  success: boolean, 
  tempPassword?: string, 
  message?: string 
}> {
  try {
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Generate a temporary password
    const tempPassword = generateTempPassword();
    
    // Set expiry to 24 hours from now
    const tempPasswordExpiry = new Date();
    tempPasswordExpiry.setHours(tempPasswordExpiry.getHours() + 24);
    
    // Update user with temporary password
    await storage.updateUser(userId, {
      tempPassword,
      tempPasswordExpiry,
      passwordResetRequired: true
    });
    
    return { success: true, tempPassword };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, message: 'An error occurred during password reset' };
  }
}

// Change a user's password
export async function changeUserPassword(
  userId: number, 
  currentPassword: string, 
  newPassword: string
): Promise<{ success: boolean, message?: string }> {
  try {
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    let isValid = false;
    
    // Check if using a temp password
    if (user.tempPassword && user.tempPasswordExpiry) {
      const tempPasswordExpiry = new Date(user.tempPasswordExpiry);
      const now = new Date();
      
      if (now < tempPasswordExpiry && currentPassword === user.tempPassword) {
        isValid = true;
      }
    } 
    // Check regular password
    else if (user.passwordHash) {
      isValid = await verifyPassword(currentPassword, user.passwordHash);
    }
    
    if (!isValid) {
      return { success: false, message: 'Current password is incorrect' };
    }
    
    // Hash the new password
    const { hash, salt } = await hashPassword(newPassword);
    
    // Update user with new password
    await storage.updateUser(userId, {
      passwordHash: hash,
      passwordSalt: salt,
      tempPassword: null,
      tempPasswordExpiry: null,
      passwordResetRequired: false
    });
    
    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    console.error('Password change error:', error);
    return { success: false, message: 'An error occurred while changing password' };
  }
}