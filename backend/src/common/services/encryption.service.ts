import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Derive key from the provided key using PBKDF2
    this.key = crypto.pbkdf2Sync(
      encryptionKey,
      'salt',
      10000,
      this.keyLength,
      'sha256',
    );
  }

  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher('aes256', this.key);

      let encrypted = iv.toString('hex') + ':';
      encrypted += cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      Buffer.from(parts.shift()!, 'hex');
      const encrypted = parts.join(':');

      const decipher = crypto.createDecipher('aes256', this.key);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  generateRandomSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  verifyHash(text: string, hash: string): boolean {
    return this.hash(text) === hash;
  }
}
