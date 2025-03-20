import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { isAdmin, isAuthenticated } from './auth';
import { EmailService, updateEmailService } from './email-service';
import { updateMailgunEmailService } from './email-service-mailgun';
import mailgunEmailService from './email-service-mailgun';
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
    
    // Update both email services with the new settings
    updateEmailService(updatedSettings);
    updateMailgunEmailService(updatedSettings);
    
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
    
    // Try to send email using Mailgun
    if (mailgunEmailService.isConfigured()) {
      console.log('Using Mailgun service for email test');
      const result = await mailgunEmailService.sendTestEmail(targetEmail);
      return res.json(result);
    } else {
      console.log('Mailgun service is not configured properly. Using simulation mode.');
      
      // If Mailgun isn't configured or fails, fallback to simulation
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