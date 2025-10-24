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
    const encryptionKey =
      this.configService.getOrThrow<string>('ENCRYPTION_KEY');

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
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:encrypted
      return (
        iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
      );
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      const iv = Buffer.from(parts.shift()!, 'hex');
      const authTag = Buffer.from(parts.shift()!, 'hex');
      const encrypted = parts.join(':');

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

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
