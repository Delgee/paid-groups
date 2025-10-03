import * as fs from 'fs';
import * as path from 'path';

// Load .env.test from the project root
const envPath = path.resolve(__dirname, '../../../.env.test');

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const [key, ...valueParts] = trimmedLine.split('=');
    const value = valueParts.join('=').trim();

    if (key && value) {
      process.env[key.trim()] = value;
    }
  }

  console.log('📝 Loaded test environment from:', envPath);
  console.log('✅ TEST_TELEGRAM_BOT_TOKEN:', process.env.TEST_TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET');
  console.log('✅ TEST_TELEGRAM_CHANNEL_ID:', process.env.TEST_TELEGRAM_CHANNEL_ID ? 'SET' : 'NOT SET');
} catch (error) {
  console.error('⚠️  Failed to load .env.test:', error.message);
}
