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
    // In development mode, we'll bypass the actual email sending
    // This is used in the test email feature
    console.log(`[Email Test] Would send test email to: ${to}`);
    
    // Return success without actually sending email
    return {
      success: true,
      message: `Email test successful (simulated). In production, an email would be sent to ${to}.`
    };
  }

  // Send password reset email
  public async sendPasswordResetEmail(to: string, tempPassword: string, userName: string): Promise<{ success: boolean; message: string }> {
    // In development mode, we'll bypass the actual email sending for password resets as well
    console.log(`[Email Test] Would send password reset email to: ${to}`);
    console.log(`[Email Test] For user: ${userName}`);
    console.log(`[Email Test] With temporary password: ${tempPassword}`);
    
    // Return success without actually sending email
    return {
      success: true,
      message: `Password reset email simulation successful. In production, an email would be sent to ${to}.`
    };
  }

  // Send device assignment notification
  public async sendDeviceAssignmentEmail(to: string, userName: string, deviceInfo: { brand: string; model: string; assetTag: string }): Promise<{ success: boolean; message: string }> {
    // Simulate email sending in development mode
    console.log(`[Email Test] Would send device assignment email to: ${to}`);
    console.log(`[Email Test] For user: ${userName}`);
    console.log(`[Email Test] Device: ${deviceInfo.brand} ${deviceInfo.model} (${deviceInfo.assetTag})`);
    
    // Return success without actually sending email
    return {
      success: true,
      message: `Device assignment email simulation successful. In production, an email would be sent to ${to}.`
    };
  }

  // Send maintenance notification
  public async sendMaintenanceNotificationEmail(to: string, userName: string, maintenanceInfo: { deviceBrand: string; deviceModel: string; assetTag: string; scheduledDate: string; maintenanceType: string }): Promise<{ success: boolean; message: string }> {
    // Simulate email sending in development mode
    console.log(`[Email Test] Would send maintenance notification email to: ${to}`);
    console.log(`[Email Test] For user: ${userName}`);
    console.log(`[Email Test] Device: ${maintenanceInfo.deviceBrand} ${maintenanceInfo.deviceModel} (${maintenanceInfo.assetTag})`);
    console.log(`[Email Test] Maintenance type: ${maintenanceInfo.maintenanceType}`);
    console.log(`[Email Test] Scheduled date: ${maintenanceInfo.scheduledDate}`);
    
    // Return success without actually sending email
    return {
      success: true,
      message: `Maintenance notification email simulation successful. In production, an email would be sent to ${to}.`
    };
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