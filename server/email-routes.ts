import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { isAdmin, isAuthenticated } from './auth';
import improvedEmailService, { updateEmailService } from './email-service-improved';
import { z } from 'zod';

const router = Router();

// Email settings schema for validation
const emailSettingsSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
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
    
    // Update the settings in the database
    const updatedSettings = await storage.updateEmailSettings(emailSettings);
    
    // Debug the settings before updating
    console.log('Email settings before update:', {
      apiKey: updatedSettings.apiKey ? '[MASKED]' : null,
      domain: updatedSettings.domain,
      fromEmail: updatedSettings.fromEmail,
      fromName: updatedSettings.fromName,
      isEnabled: updatedSettings.isEnabled,
    });
    
    // Update the improved email service with the new settings
    const emailService = updateEmailService(updatedSettings);
    
    // Debug email service configuration after update
    console.log('Email service configured?', emailService.isConfigured());
    
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
    
    // Get the target email from request or use the fromEmail from settings
    const targetEmail = req.body.email || emailSettings.fromEmail;
    
    if (!targetEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target email is required' 
      });
    }
    
    console.log(`Sending email test to: ${targetEmail} using domain: ${emailSettings.domain}`);
    
    // Debug the email settings
    console.log('Email settings from test endpoint:', {
      apiKey: emailSettings.apiKey ? '[MASKED]' : null,
      domain: emailSettings.domain,
      fromEmail: emailSettings.fromEmail,
      fromName: emailSettings.fromName,
      isEnabled: emailSettings.isEnabled,
    });
    
    // Always update the email service with the latest settings before checking
    console.log('Updating email service with current settings...');
    const updatedEmailService = updateEmailService(emailSettings);
    
    // Try to send email using the improved email service
    const isEmailServiceConfigured = updatedEmailService.isConfigured();
    console.log('Is email service configured?', isEmailServiceConfigured);
    
    if (isEmailServiceConfigured) {
      console.log('Using email service for test');
      const result = await updatedEmailService.sendTestEmail(targetEmail);
      return res.json(result);
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

export default router;