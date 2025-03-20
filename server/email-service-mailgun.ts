import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { storage } from './storage';

// Initialize Mailgun client
const mailgun = new Mailgun(formData);

// Email interfaces
export interface EmailSettings {
  id?: number;
  apiKey: string | null;
  domain: string | null;
  fromEmail: string | null;
  fromName: string | null;
  isEnabled: boolean | null;
  updatedAt?: Date | null;
}

export interface EmailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    data: Buffer | string;
    contentType?: string;
  }>;
}

export class MailgunEmailService {
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

  public isConfigured(): boolean {
    // Check explicitly that isEnabled is true (not just truthy)
    return this.isEnabled === true && !!this.client && !!this.domain && !!this.fromEmail;
  }

  // Send an email
  public async sendEmail(emailData: EmailData): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { 
        success: false, 
        message: 'Email service is not configured or is disabled' 
      };
    }

    try {
      // Use a very simplified from format to avoid UTF-8 issues
      const fromAddress = this.fromEmail!;
      
      const messageData = {
        from: fromAddress,
        to: [emailData.to],
        subject: emailData.subject,
        text: emailData.text || 'Please enable HTML to view this email',
        html: emailData.html || '',
      };

      // Add attachments if they exist
      if (emailData.attachments && emailData.attachments.length > 0) {
        Object.assign(messageData, {
          attachment: emailData.attachments.map(attachment => ({
            filename: attachment.filename,
            data: attachment.data,
            contentType: attachment.contentType
          }))
        });
      }

      // Log for debugging
      console.log('Mailgun sending message:', {
        from: fromAddress,
        to: emailData.to,
        domain: this.domain,
      });

      await this.client.messages.create(this.domain!, messageData);
      
      return {
        success: true,
        message: 'Email sent successfully',
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Send a test email
  public async sendTestEmail(to: string): Promise<{ success: boolean; message: string }> {
    // Simple ASCII-only subject and content to avoid encoding issues
    const subject = 'AssetTrack Email Test';
    const text = 'This is a test email from AssetTrack. If you receive this, email sending is configured correctly.';
    const html = '<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>AssetTrack Email Test</h2><p>This is a test email from AssetTrack.</p><p>If you are receiving this email, it means that your email configuration is working correctly.</p></div>';
    
    return this.sendEmail({ to, subject, text, html });
  }

  // Send password reset email
  public async sendPasswordResetEmail(to: string, tempPassword: string, userName: string): Promise<{ success: boolean; message: string }> {
    // Simple ASCII-only subject and content to avoid encoding issues
    const subject = 'AssetTrack - Your Temporary Password';
    const text = `Hello ${userName}, A password reset has been requested for your account. Your temporary password is: ${tempPassword}. You will be required to change this password the first time you log in.`;
    const html = `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>AssetTrack Password Reset</h2><p>Hello ${userName},</p><p>A password reset has been requested for your account. Here is your temporary password:</p><div style="margin: 20px 0; padding: 10px; background-color: #f3f4f6; font-family: monospace; font-size: 16px;">${tempPassword}</div><p>You will be required to change this password the first time you log in.</p></div>`;
    
    return this.sendEmail({ to, subject, text, html });
  }

  // Send device assignment notification
  public async sendDeviceAssignmentEmail(to: string, userName: string, deviceInfo: { brand: string; model: string; assetTag: string }): Promise<{ success: boolean; message: string }> {
    // Simple ASCII-only subject and content to avoid encoding issues
    const subject = 'AssetTrack - New Device Assignment';
    const text = `Hello ${userName}, A new device has been assigned to you: ${deviceInfo.brand} ${deviceInfo.model} (${deviceInfo.assetTag}). Please contact your IT department if you have any questions about this assignment.`;
    const html = `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>New Device Assignment</h2><p>Hello ${userName},</p><p>A new device has been assigned to you:</p><p>Brand: ${deviceInfo.brand}</p><p>Model: ${deviceInfo.model}</p><p>Asset Tag: ${deviceInfo.assetTag}</p><p>Please contact your IT department if you have any questions about this assignment.</p></div>`;
    
    return this.sendEmail({ to, subject, text, html });
  }

  // Send maintenance notification
  public async sendMaintenanceNotificationEmail(to: string, userName: string, maintenanceInfo: { deviceBrand: string; deviceModel: string; assetTag: string; scheduledDate: string; maintenanceType: string }): Promise<{ success: boolean; message: string }> {
    // Simple ASCII-only subject and content to avoid encoding issues
    const subject = 'AssetTrack - Scheduled Maintenance Reminder';
    const text = `Hello ${userName}, This is a reminder about upcoming scheduled maintenance for your device: ${maintenanceInfo.deviceBrand} ${maintenanceInfo.deviceModel} (${maintenanceInfo.assetTag}). Maintenance Type: ${maintenanceInfo.maintenanceType}. Scheduled Date: ${maintenanceInfo.scheduledDate}. Please ensure the device is available for maintenance on the scheduled date.`;
    const html = `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>Scheduled Maintenance Reminder</h2><p>Hello ${userName},</p><p>This is a reminder about upcoming scheduled maintenance for your device:</p><p>Device: ${maintenanceInfo.deviceBrand} ${maintenanceInfo.deviceModel}</p><p>Asset Tag: ${maintenanceInfo.assetTag}</p><p>Maintenance Type: ${maintenanceInfo.maintenanceType}</p><p>Scheduled Date: ${maintenanceInfo.scheduledDate}</p><p>Please ensure the device is available for maintenance on the scheduled date.</p></div>`;
    
    return this.sendEmail({ to, subject, text, html });
  }
}

// Create a default instance with no configuration
let mailgunEmailService = new MailgunEmailService(null);

// Function to update the email service with new settings
export function updateMailgunEmailService(settings: EmailSettings | null) {
  mailgunEmailService = new MailgunEmailService(settings);
  return mailgunEmailService;
}

// Export the singleton instance
export default mailgunEmailService;