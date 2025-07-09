import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

export class TwoFactorService {
  /**
   * Generate a new secret for 2FA setup
   */
  static generateSecret(userEmail: string, companyName: string = 'Connecta'): {
    secret: string;
    otpauthUrl: string;
  } {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: companyName,
      length: 32
    });

    console.log('2FA Secret Generation Debug:');
    console.log('- User Email:', userEmail);
    console.log('- Company:', companyName);
    console.log('- Generated secret (base32):', secret.base32);
    console.log('- Secret length:', secret.base32?.length);
    console.log('- OTP Auth URL:', secret.otpauth_url);

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url || ''
    };
  }

  /**
   * Generate QR code data URL for the secret
   */
  static async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token against a secret
   */
  static verifyToken(token: string, secret: string, window: number = 1): boolean {
    try {
      console.log('2FA Verification Debug:');
      console.log('- Token received:', token);
      console.log('- Secret length:', secret.length);
      console.log('- Window:', window);
      
      const result = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window // Allow some time drift
      });
      
      console.log('- Verification result:', result);
      
      // Also try with a larger window for debugging
      if (!result) {
        console.log('Trying with larger window (5)...');
        const resultLargeWindow = speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token,
          window: 5
        });
        console.log('- Large window result:', resultLargeWindow);
      }
      
      return result;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  }

  /**
   * Generate backup codes for account recovery
   */
  static generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Verify if a backup code is valid
   */
  static verifyBackupCode(inputCode: string, backupCodes: string[]): {
    isValid: boolean;
    remainingCodes: string[];
  } {
    const normalizedInput = inputCode.toUpperCase().trim();
    const codeIndex = backupCodes.indexOf(normalizedInput);
    
    if (codeIndex === -1) {
      return {
        isValid: false,
        remainingCodes: backupCodes
      };
    }

    // Remove the used backup code
    const remainingCodes = backupCodes.filter((_, index) => index !== codeIndex);
    
    return {
      isValid: true,
      remainingCodes
    };
  }

  /**
   * Generate a current TOTP token (for testing purposes)
   */
  static generateCurrentToken(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32'
    });
  }
}