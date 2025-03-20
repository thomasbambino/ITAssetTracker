import formData from 'form-data';
import Mailgun from 'mailgun.js';

// Initialize Mailgun client
const mailgun = new Mailgun(formData);

// Interface for email settings
export interface EmailSettings {
  id?: number;
  apiKey: string | null;
  domain: string | null;
  fromEmail: string | null;
  fromName: string | null;
  isEnabled: boolean;
}

// Interface for email data
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

// Class to handle email operations
export class EmailService {
  private client: any;
  private domain: string | null;
  private fromEmail: string | null;
  private fromName: string | null;
  private isEnabled: boolean;

  constructor(settings: EmailSettings | null) {
    this.isEnabled = settings?.isEnabled || false;
    
    if (settings?.apiKey && settings?.domain) {
      this.client = mailgun.client({ username: 'api', key: settings.apiKey });
      this.domain = settings.domain;
      this.fromEmail = settings.fromEmail;
      this.fromName = settings.fromName;
    } else {
      this.client = null;
      this.domain = null;
      this.fromEmail = null;
      this.fromName = null;
    }
  }

  // Check if email service is configured and enabled
  public isConfigured(): boolean {
    return this.isEnabled && !!this.client && !!this.domain && !!this.fromEmail;
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
      // Create a simple ASCII-only version for the text field
      const plainText = emailData.text || 'This is an email from AssetTrack. Please enable HTML viewing to see the complete message.';
      
      // Create a simpler HTML version with ASCII only
      const safeHtml = 
        '<div style="font-family: Arial, sans-serif; padding: 20px;">' +
        '<h2>AssetTrack Email</h2>' +
        '<p>This is a message from AssetTrack.</p>' +
        '</div>';
      
      const messageData = {
        from: this.fromEmail, // Simplify the "from" field to avoid encoding issues
        to: emailData.to,
        subject: emailData.subject,
        text: plainText,
        html: safeHtml, // Use the simplified HTML as a fallback
      };

      // Add attachments if they exist
      if (emailData.attachments && emailData.attachments.length > 0) {
        const attachments = emailData.attachments.map(attachment => ({
          filename: attachment.filename,
          data: attachment.data,
          contentType: attachment.contentType
        }));
        Object.assign(messageData, { attachment: attachments });
      }

      const response = await this.client.messages.create(this.domain!, messageData);
      
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
    return this.sendEmail({
      to,
      subject: 'AssetTrack Email Test',
      text: 'This is a test email from AssetTrack. If you receive this, email sending is configured correctly.',
      html: 
        '<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">' + 
        '<h2 style="color: #4f46e5;">AssetTrack Email Test</h2>' + 
        '<p>This is a test email from AssetTrack.</p>' + 
        '<p>If you are receiving this email, it means that your email configuration is working correctly.</p>' + 
        '<p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">' + 
        'This is an automated message from AssetTrack. Please do not reply to this email.' + 
        '</p>' + 
        '</div>'
    });
  }

  // Send password reset email
  public async sendPasswordResetEmail(to: string, tempPassword: string, userName: string): Promise<{ success: boolean; message: string }> {
    return this.sendEmail({
      to,
      subject: 'AssetTrack - Your Temporary Password',
      html: 
        '<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">' +
        '<h2 style="color: #4f46e5;">AssetTrack Password Reset</h2>' +
        '<p>Hello ' + userName + ',</p>' +
        '<p>A password reset has been requested for your account. Here is your temporary password:</p>' +
        '<div style="margin: 20px 0; padding: 10px; background-color: #f3f4f6; border-radius: 5px; font-family: monospace; font-size: 16px;">' +
        tempPassword +
        '</div>' +
        '<p>You will be required to change this password the first time you log in.</p>' +
        '<p>If you did not request this password reset, please contact your administrator immediately.</p>' +
        '<p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">' +
        'This is an automated message from AssetTrack. Please do not reply to this email.' +
        '</p>' +
        '</div>'
    });
  }

  // Send device assignment notification
  public async sendDeviceAssignmentEmail(to: string, userName: string, deviceInfo: { brand: string; model: string; assetTag: string }): Promise<{ success: boolean; message: string }> {
    return this.sendEmail({
      to,
      subject: 'AssetTrack - New Device Assignment',
      html: 
        '<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">' +
        '<h2 style="color: #4f46e5;">New Device Assignment</h2>' +
        '<p>Hello ' + userName + ',</p>' +
        '<p>A new device has been assigned to you:</p>' +
        '<div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">' +
        '<p><strong>Brand:</strong> ' + deviceInfo.brand + '</p>' +
        '<p><strong>Model:</strong> ' + deviceInfo.model + '</p>' +
        '<p><strong>Asset Tag:</strong> ' + deviceInfo.assetTag + '</p>' +
        '</div>' +
        '<p>Please contact your IT department if you have any questions about this assignment.</p>' +
        '<p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">' +
        'This is an automated message from AssetTrack. Please do not reply to this email.' +
        '</p>' +
        '</div>'
    });
  }

  // Send maintenance notification
  public async sendMaintenanceNotificationEmail(to: string, userName: string, maintenanceInfo: { deviceBrand: string; deviceModel: string; assetTag: string; scheduledDate: string; maintenanceType: string }): Promise<{ success: boolean; message: string }> {
    return this.sendEmail({
      to,
      subject: 'AssetTrack - Scheduled Maintenance Reminder',
      html: 
        '<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">' +
        '<h2 style="color: #4f46e5;">Scheduled Maintenance Reminder</h2>' +
        '<p>Hello ' + userName + ',</p>' +
        '<p>This is a reminder about upcoming scheduled maintenance for your device:</p>' +
        '<div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">' +
        '<p><strong>Device:</strong> ' + maintenanceInfo.deviceBrand + ' ' + maintenanceInfo.deviceModel + '</p>' +
        '<p><strong>Asset Tag:</strong> ' + maintenanceInfo.assetTag + '</p>' +
        '<p><strong>Maintenance Type:</strong> ' + maintenanceInfo.maintenanceType + '</p>' +
        '<p><strong>Scheduled Date:</strong> ' + maintenanceInfo.scheduledDate + '</p>' +
        '</div>' +
        '<p>Please ensure the device is available for maintenance on the scheduled date.</p>' +
        '<p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">' +
        'This is an automated message from AssetTrack. Please do not reply to this email.' +
        '</p>' +
        '</div>'
    });
  }
}

// Create a default instance with no configuration
let emailService = new EmailService(null);

// Function to update the email service with new settings
export function updateEmailService(settings: EmailSettings | null) {
  emailService = new EmailService(settings);
  return emailService;
}

// Export the singleton instance
export default emailService;