import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

export class TwoFactorService {
  /**
   * Generate a new secret for 2FA setup
   */
  static generateSecret(userEmail: string, companyName: string = 'AssetTrack'): {
    secret: string;
    otpauthUrl: string;
  } {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: companyName,
      length: 32
    });

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
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window // Allow some time drift
      });
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