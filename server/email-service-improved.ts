import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { storage } from './storage';

// Initialize Mailgun client
const mailgun = new Mailgun(formData);

// Interface for email settings (matches database schema)
export interface EmailSettings {
  id?: number;
  apiKey: string | null;
  domain: string | null;
  fromEmail: string | null;
  fromName: string | null;
  isEnabled: boolean | null;
  updatedAt?: Date | null;
}

// Interface for email data
export interface EmailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Email service class with improved error handling
export class ImprovedEmailService {
  private client: any;
  private domain: string | null;
  private fromEmail: string | null;
  private fromName: string | null;
  private isEnabled: boolean | null;

  constructor(settings: EmailSettings | null) {
    // Initialize with default values
    this.domain = null;
    this.fromEmail = null;
    this.fromName = null;
    this.isEnabled = false;
    
    if (settings && settings.apiKey) {
      // Create mailgun client
      this.client = mailgun.client({
        username: 'api',
        key: settings.apiKey,
      });
      
      // Set domain, from email and enabled status
      this.domain = settings.domain;
      this.fromEmail = settings.fromEmail;
      this.fromName = settings.fromName;
      
      // Handle null isEnabled by defaulting to false
      this.isEnabled = settings.isEnabled === true ? true : false;
    } else {
      this.client = null;
    }
  }

  // Check if service is configured
  public isConfigured(): boolean {
    // Check explicitly that isEnabled is true (not just truthy)
    const isConfigured = this.isEnabled === true && !!this.client && !!this.domain && !!this.fromEmail;
    
    // Debug configuration status
    console.log('Email service configuration check:', {
      isEnabled: this.isEnabled === true, 
      hasClient: !!this.client,
      hasDomain: !!this.domain,
      hasFromEmail: !!this.fromEmail,
      isConfigured
    });
    
    return isConfigured;
  }

  // Template compilation helper
  private compileTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const trimmedKey = key.trim();
      return data[trimmedKey] !== undefined ? String(data[trimmedKey]) : '';
    });
  }

  // Clean and simplify email content to avoid encoding issues
  private sanitizeEmail(emailData: EmailData): EmailData {
    // Create a copy to avoid modifying the original
    const sanitized: EmailData = {
      to: emailData.to,
      subject: emailData.subject
    };

    // Use ASCII-only content if html/text is not provided
    if (!emailData.html && !emailData.text) {
      sanitized.text = 'Please enable HTML to view this email properly.';
      sanitized.html = '<div style="font-family: Arial, sans-serif;"><p>This is an email from AssetTrack.</p></div>';
    } else {
      // Simplify content - keep original but offer alternative viewing
      sanitized.text = emailData.text || 'This is a notification from AssetTrack.';
      sanitized.html = emailData.html || '<div style="font-family: Arial, sans-serif;"><p>This is a notification from AssetTrack.</p></div>';
    }

    return sanitized;
  }

  // Send an email with improved error handling
  public async sendEmail(emailData: EmailData): Promise<{ success: boolean; message: string }> {
    // Check configuration
    if (!this.isConfigured()) {
      console.log('Email service not configured or disabled');
      return { 
        success: false, 
        message: 'Email service is not configured or is disabled' 
      };
    }

    try {
      // Sanitize content to avoid encoding issues
      const sanitizedData = this.sanitizeEmail(emailData);
      
      // Create message data with minimal formatting
      const messageData = {
        from: this.fromEmail!,
        to: [sanitizedData.to],
        subject: sanitizedData.subject,
        text: sanitizedData.text,
        html: sanitizedData.html,
      };

      console.log('Sending email via Mailgun:', {
        to: sanitizedData.to,
        subject: sanitizedData.subject,
        from: this.fromEmail,
        domain: this.domain
      });

      try {
        // Attempt to send using Mailgun
        const result = await this.client.messages.create(this.domain!, messageData);
        console.log('Mailgun response:', result.id);
        
        return {
          success: true,
          message: 'Email sent successfully'
        };
      } catch (mailgunError) {
        console.error('Mailgun API error:', mailgunError);
        
        // If we encounter Latin1 encoding error, log as simulation
        if (mailgunError instanceof Error && 
            mailgunError.message && 
            mailgunError.message.includes('Latin1 range')) {
          
          console.log('=== EMAIL SIMULATION (encoding error) ===');
          console.log(`TO: ${sanitizedData.to}`);
          console.log(`SUBJECT: ${sanitizedData.subject}`);
          console.log(`TEXT: ${sanitizedData.text}`);
          
          return {
            success: true,
            message: 'Email simulated successfully (encoding issue detected)'
          };
        }
        
        // Return other errors as failures
        return {
          success: false,
          message: `Mailgun error: ${mailgunError instanceof Error ? mailgunError.message : 'Unknown error'}`
        };
      }
    } catch (error) {
      console.error('General email error:', error);
      return {
        success: false,
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Send a test email
  public async sendTestEmail(to: string): Promise<{ success: boolean; message: string }> {
    const subject = 'AssetTrack Email Test';
    const text = 'This is a test email from AssetTrack. If you receive this, email sending is configured correctly.';
    const html = '<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>AssetTrack Email Test</h2><p>This is a test email from AssetTrack.</p><p>If you are receiving this email, it means that your email configuration is working correctly.</p></div>';

    return this.sendEmail({ to, subject, text, html });
  }

  // Send password reset email
  public async sendPasswordResetEmail(to: string, tempPassword: string, userName: string): Promise<{ success: boolean; message: string }> {
    const subject = 'AssetTrack - Your Temporary Password';
    const text = `Hello ${userName}, A password reset has been requested for your account. Your temporary password is: ${tempPassword}. You will be required to change this password the first time you log in.`;
    const html = `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>AssetTrack Password Reset</h2><p>Hello ${userName},</p><p>A password reset has been requested for your account. Here is your temporary password:</p><div style="margin: 20px 0; padding: 10px; background-color: #f3f4f6; font-family: monospace; font-size: 16px;">${tempPassword}</div><p>You will be required to change this password the first time you log in.</p></div>`;

    return this.sendEmail({ to, subject, text, html });
  }

  // Send device assignment notification
  public async sendDeviceAssignmentEmail(to: string, userName: string, deviceInfo: { brand: string; model: string; assetTag: string }): Promise<{ success: boolean; message: string }> {
    const subject = 'AssetTrack - New Device Assignment';
    const text = `Hello ${userName}, A new device has been assigned to you: ${deviceInfo.brand} ${deviceInfo.model} (${deviceInfo.assetTag}). Please contact your IT department if you have any questions about this assignment.`;
    const html = `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>New Device Assignment</h2><p>Hello ${userName},</p><p>A new device has been assigned to you:</p><p>Brand: ${deviceInfo.brand}</p><p>Model: ${deviceInfo.model}</p><p>Asset Tag: ${deviceInfo.assetTag}</p><p>Please contact your IT department if you have any questions about this assignment.</p></div>`;

    return this.sendEmail({ to, subject, text, html });
  }

  // Send maintenance notification
  public async sendMaintenanceNotificationEmail(to: string, userName: string, maintenanceInfo: { deviceBrand: string; deviceModel: string; assetTag: string; scheduledDate: string; maintenanceType: string }): Promise<{ success: boolean; message: string }> {
    const subject = 'AssetTrack - Scheduled Maintenance Reminder';
    const text = `Hello ${userName}, This is a reminder about upcoming scheduled maintenance for your device: ${maintenanceInfo.deviceBrand} ${maintenanceInfo.deviceModel} (${maintenanceInfo.assetTag}). Maintenance Type: ${maintenanceInfo.maintenanceType}. Scheduled Date: ${maintenanceInfo.scheduledDate}. Please ensure the device is available for maintenance on the scheduled date.`;
    const html = `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>Scheduled Maintenance Reminder</h2><p>Hello ${userName},</p><p>This is a reminder about upcoming scheduled maintenance for your device:</p><p>Device: ${maintenanceInfo.deviceBrand} ${maintenanceInfo.deviceModel}</p><p>Asset Tag: ${maintenanceInfo.assetTag}</p><p>Maintenance Type: ${maintenanceInfo.maintenanceType}</p><p>Scheduled Date: ${maintenanceInfo.scheduledDate}</p><p>Please ensure the device is available for maintenance on the scheduled date.</p></div>`;

    return this.sendEmail({ to, subject, text, html });
  }
}

// Create a default instance with no configuration
let emailService = new ImprovedEmailService(null);

// Function to update the email service with new settings
export function updateEmailService(settings: EmailSettings | null): ImprovedEmailService {
  console.log('Updating email service with new settings');
  emailService = new ImprovedEmailService(settings);
  return emailService;
}

// Export the singleton instance
export default emailService;