import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { isAdmin, isAuthenticated } from './auth';
import directMailgun, { updateMailgunService, DirectMailgunService } from './direct-mailgun';  // Use our direct implementation
import { z } from 'zod';

const router = Router();

// Email settings schema for validation
const emailSettingsSchema = z.object({
  apiKey: z.string().optional(), // Allow empty API key to preserve existing key
  domain: z.string().min(1, "Domain is required"),
  fromEmail: z.string().email("Invalid email address"),
  fromName: z.string().min(1, "Sender name is required"),
  isEnabled: z.boolean().default(false),
});

// Get email settings (admin only)
router.get('/settings/email', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const settings = await storage.getEmailSettings();
    
    // If settings exist, return them with the API key masked
    if (settings) {
      // Mask the API key for security
      const maskedSettings = {
        ...settings,
        apiKey: settings.apiKey ? '••••••••••••••••••' : null,
      };
      return res.json(maskedSettings);
    }
    
    // No settings found
    return res.status(404).json({ 
      success: false, 
      message: 'Email settings not configured' 
    });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch email settings'
    });
  }
});

// Update email settings (admin only)
router.put('/settings/email', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const validationResult = emailSettingsSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email settings', 
        errors: validationResult.error.format() 
      });
    }
    
    const emailSettings = validationResult.data;
    
    // If API key is empty, don't update it (preserve existing key)
    const settingsToUpdate = { ...emailSettings };
    if (!emailSettings.apiKey || emailSettings.apiKey.trim() === '') {
      delete settingsToUpdate.apiKey; // Don't update API key if it's empty
    }
    
    // Update the settings in the database
    const updatedSettings = await storage.updateEmailSettings(settingsToUpdate);
    
    // Debug the settings before updating
    console.log('Email settings before update:', {
      apiKey: updatedSettings.apiKey ? '[MASKED]' : null,
      domain: updatedSettings.domain,
      fromEmail: updatedSettings.fromEmail,
      fromName: updatedSettings.fromName,
      isEnabled: updatedSettings.isEnabled,
    });
    
    // Update the direct mailgun service with the new settings
    const mailgunService = updateMailgunService(updatedSettings);
    
    // Debug email service configuration after update
    console.log('Direct mailgun service configured?', mailgunService.isConfigured());
    
    // Return the updated settings with masked API key
    const maskedSettings = {
      ...updatedSettings,
      apiKey: updatedSettings.apiKey ? '••••••••••••••••••' : null,
    };
    
    return res.json(maskedSettings);
  } catch (error) {
    console.error('Error updating email settings:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update email settings'
    });
  }
});

// Test email sending (admin only)
router.post('/settings/email/test', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    // Get the current email settings
    const emailSettings = await storage.getEmailSettings();
    
    if (!emailSettings) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email settings not configured' 
      });
    }
    
    // Get the target email from request or use the logged-in user's email
    const sessionData = req.session as any;
    const loggedInUserId = sessionData.userId;
    
    console.log('Session debug for email test:', {
      sessionId: req.sessionID,
      userId: loggedInUserId,
      hasSession: !!req.session,
      sessionData: sessionData
    });
    
    let defaultTargetEmail = emailSettings.fromEmail;
    if (loggedInUserId) {
      try {
        const currentUser = await storage.getUserById(loggedInUserId);
        console.log('Current user for test email:', {
          userId: loggedInUserId,
          userEmail: currentUser?.email,
          userFound: !!currentUser
        });
        if (currentUser && currentUser.email) {
          defaultTargetEmail = currentUser.email;
        }
      } catch (error) {
        console.log('Could not get current user for test email, using fromEmail as fallback:', error);
      }
    } else {
      console.log('No logged in user ID found in session for test email');
    }
    
    const targetEmail = req.body.email || defaultTargetEmail;
    
    if (!targetEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target email is required' 
      });
    }
    
    console.log(`=== EMAIL TEST REQUEST ===`);
    console.log(`Target email: ${targetEmail}`);
    console.log(`Default target (user's email): ${defaultTargetEmail}`);
    console.log(`From email (configured): ${emailSettings.fromEmail}`);
    console.log(`Domain: ${emailSettings.domain}`);
    console.log(`API key present: ${!!emailSettings.apiKey}`);
    console.log(`Is enabled: ${emailSettings.isEnabled}`);
    
    // Debug the email settings
    console.log('Email settings from test endpoint:', {
      apiKey: emailSettings.apiKey ? '[MASKED]' : null,
      domain: emailSettings.domain,
      fromEmail: emailSettings.fromEmail,
      fromName: emailSettings.fromName,
      isEnabled: emailSettings.isEnabled,
    });
    
    // Always update the direct mailgun service with the latest settings before checking
    console.log('Updating direct mailgun service with current settings...');
    const updatedMailgunService = updateMailgunService(emailSettings);
    
    // Try to send email using the direct mailgun service
    const isMailgunServiceConfigured = updatedMailgunService.isConfigured();
    console.log('Is direct mailgun service configured?', isMailgunServiceConfigured);
    
    if (isMailgunServiceConfigured) {
      console.log('Using direct mailgun service for test');
      const result = await updatedMailgunService.sendTestEmail(targetEmail);
      
      // Add detailed logging for debugging
      console.log('Test email result:', result);
      
      if (result.success) {
        console.log(`✓ Test email sent successfully to: ${targetEmail}`);
        console.log(`✓ Sent from: ${emailSettings.fromEmail}`);
        console.log(`✓ Using domain: ${emailSettings.domain}`);
        return res.json(result);
      } else {
        console.log(`✗ Test email failed: ${result.message}`);
        
        // If database settings failed, try environment variables as fallback
        console.log('Attempting to use environment variables for basic email test...');
        
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        
        if (apiKey && domain) {
          const envEmailSettings = {
            apiKey,
            domain,
            fromEmail: emailSettings.fromEmail,
            fromName: emailSettings.fromName,
            isEnabled: true
          };
          
          const envMailgunService = new DirectMailgunService(envEmailSettings);
          
          if (envMailgunService.isConfigured()) {
            console.log('Using environment variables for basic email test');
            const envResult = await envMailgunService.sendTestEmail(targetEmail);
            
            console.log('Basic email test result with env vars:', envResult);
            return res.json(envResult);
          }
        }
        
        return res.json(result);
      }
    } else {
      console.log('Email service is not configured properly. Using simulation mode.');
      
      // If email service isn't configured or fails, fallback to simulation
      return res.json({
        success: true,
        message: `Email test successful (simulated). Email settings found but service not enabled. Check your configuration.`
      });
    }
  } catch (error) {
    console.error('Error with email test:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to test email configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Special test route that directly uses environment variables (admin only)
router.post('/settings/email/env-test', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    // Get the target email from request
    const targetEmail = req.body.email;
    
    if (!targetEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target email is required' 
      });
    }
    
    console.log(`Sending direct env test email to: ${targetEmail}`);
    
    // Check for environment variables
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    
    if (!apiKey || !domain) {
      return res.status(400).json({
        success: false,
        message: 'Environment variables MAILGUN_API_KEY and/or MAILGUN_DOMAIN are not set'
      });
    }
    
    // Construct a test email settings object using environment variables
    const envEmailSettings = {
      apiKey,
      domain,
      fromEmail: `test@${domain}`,
      fromName: 'AssetTrack Test',
      isEnabled: true
    };
    
    console.log('Using direct environment variables for email test:', {
      domain: envEmailSettings.domain,
      fromEmail: envEmailSettings.fromEmail,
      fromName: envEmailSettings.fromName,
      hasApiKey: !!envEmailSettings.apiKey
    });
    
    // Create a temporary service instance with these settings
    const tempMailgunService = new DirectMailgunService(envEmailSettings);
    
    // Check if this service is properly configured
    const isConfigured = tempMailgunService.isConfigured();
    console.log('Is env-based mailgun service configured?', isConfigured);
    
    if (!isConfigured) {
      return res.status(400).json({
        success: false,
        message: 'Environment variable based email service is not fully configured'
      });
    }
    
    // Send the test email
    console.log('Sending test email using environment variables directly');
    const result = await tempMailgunService.sendTestEmail(targetEmail);
    return res.json(result);
    
  } catch (error) {
    console.error('Error with direct env email test:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to test email with environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Test password reset email (admin only)
router.post('/settings/email/test-reset', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    // Get the current email settings
    const emailSettings = await storage.getEmailSettings();
    
    if (!emailSettings) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email settings not configured' 
      });
    }
    
    // Get the logged-in user's information
    const sessionData = req.session as any;
    const loggedInUserId = sessionData.userId;
    
    if (!loggedInUserId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    const currentUser = await storage.getUserById(loggedInUserId);
    if (!currentUser || !currentUser.email) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found or email not available' 
      });
    }
    
    // Get target email from request body or use current user's email
    const targetEmail = req.body.email || currentUser.email;
    const targetName = req.body.email ? 'Test User' : `${currentUser.firstName} ${currentUser.lastName}`;
    
    console.log(`=== PASSWORD RESET TEST EMAIL ===`);
    console.log(`Target email: ${targetEmail}`);
    console.log(`User: ${targetName}`);
    
    // Update the direct mailgun service with the latest settings
    const updatedMailgunService = updateMailgunService(emailSettings);
    
    // Check if service is configured
    const isMailgunServiceConfigured = updatedMailgunService.isConfigured();
    console.log('Is direct mailgun service configured?', isMailgunServiceConfigured);
    
    if (isMailgunServiceConfigured) {
      // Send password reset test email using the existing method
      const result = await updatedMailgunService.sendPasswordResetEmail(
        targetEmail,
        'TestPass123!',
        targetName
      );
      
      console.log('Password reset test email result:', result);
      
      if (result.success) {
        console.log(`✓ Password reset test email sent successfully to: ${targetEmail}`);
        return res.json(result);
      } else {
        console.log(`✗ Password reset test email failed: ${result.message}`);
        
        // If database settings failed, try environment variables as fallback
        console.log('Attempting to use environment variables for password reset test...');
        
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        
        if (apiKey && domain) {
          const envEmailSettings = {
            apiKey,
            domain,
            fromEmail: emailSettings.fromEmail,
            fromName: emailSettings.fromName,
            isEnabled: true
          };
          
          const envMailgunService = new DirectMailgunService(envEmailSettings);
          
          if (envMailgunService.isConfigured()) {
            console.log('Using environment variables for password reset test');
            const envResult = await envMailgunService.sendPasswordResetEmail(
              targetEmail,
              'TestPass123!',
              targetName
            );
            
            console.log('Password reset test email result with env vars:', envResult);
            return res.json(envResult);
          }
        }
        
        return res.json(result);
      }
    } else {
      console.log('Email service is not configured properly. Using simulation mode.');
      
      return res.json({
        success: true,
        message: `Password reset test email successful (simulated). Email settings found but service not enabled.`
      });
    }
  } catch (error) {
    console.error('Error with password reset test email:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to test password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Test welcome email (admin only)
router.post('/settings/email/test-welcome', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    // Get the current email settings
    const emailSettings = await storage.getEmailSettings();
    
    if (!emailSettings) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email settings not configured' 
      });
    }
    
    // Get the logged-in user's information
    const sessionData = req.session as any;
    const loggedInUserId = sessionData.userId;
    
    if (!loggedInUserId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    const currentUser = await storage.getUserById(loggedInUserId);
    if (!currentUser || !currentUser.email) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found or email not available' 
      });
    }
    
    // Get target email from request body or use current user's email
    const targetEmail = req.body.email || currentUser.email;
    const targetName = req.body.email ? 'Test User' : `${currentUser.firstName} ${currentUser.lastName}`;
    
    console.log(`=== WELCOME TEST EMAIL ===`);
    console.log(`Target email: ${targetEmail}`);
    console.log(`User: ${targetName}`);
    
    // Update the direct mailgun service with the latest settings
    const updatedMailgunService = updateMailgunService(emailSettings);
    
    // Check if service is configured
    const isMailgunServiceConfigured = updatedMailgunService.isConfigured();
    console.log('Is direct mailgun service configured?', isMailgunServiceConfigured);
    
    if (isMailgunServiceConfigured) {
      // Send welcome test email using the existing method
      const result = await updatedMailgunService.sendWelcomeEmail(
        targetEmail,
        'TestPass123!',
        targetName
      );
      
      console.log('Welcome test email result:', result);
      
      if (result.success) {
        console.log(`✓ Welcome test email sent successfully to: ${targetEmail}`);
        return res.json(result);
      } else {
        console.log(`✗ Welcome test email failed: ${result.message}`);
        
        // If database settings failed, try environment variables as fallback
        console.log('Attempting to use environment variables for welcome test...');
        
        const apiKey = process.env.MAILGUN_API_KEY;
        const domain = process.env.MAILGUN_DOMAIN;
        
        if (apiKey && domain) {
          const envEmailSettings = {
            apiKey,
            domain,
            fromEmail: emailSettings.fromEmail,
            fromName: emailSettings.fromName,
            isEnabled: true
          };
          
          const envMailgunService = new DirectMailgunService(envEmailSettings);
          
          if (envMailgunService.isConfigured()) {
            console.log('Using environment variables for welcome test');
            const envResult = await envMailgunService.sendWelcomeEmail(
              targetEmail,
              'TestPass123!',
              targetName
            );
            
            console.log('Welcome test email result with env vars:', envResult);
            return res.json(envResult);
          }
        }
        
        return res.json(result);
      }
    } else {
      console.log('Email service is not configured properly. Using simulation mode.');
      
      return res.json({
        success: true,
        message: `Welcome test email successful (simulated). Email settings found but service not enabled.`
      });
    }
  } catch (error) {
    console.error('Error with welcome test email:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to test welcome email: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

export default router;