import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

// server/.env wins, a repo-level .env works too. dotenv never overrides
// variables that are already set, so real environment variables always win.
dotenv.config({ path: path.resolve(here, '../../.env') });
dotenv.config({ path: path.resolve(here, '../../../.env') });

const list = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const env = {
  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  },
  get isTest() {
    return this.nodeEnv === 'test';
  },
  get port() {
    return Number(process.env.PORT) || 5000;
  },
  get jwtSecret() {
    return process.env.JWT_SECRET;
  },
  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '7d';
  },
  get clientOrigins() {
    return list(process.env.CLIENT_ORIGIN || 'http://localhost:5173');
  },
  get adminEmails() {
    return list(process.env.ADMIN_EMAILS).map((email) => email.toLowerCase());
  },
};

export function assertEnv() {
  const missing = ['JWT_SECRET'].filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to server/.env and fill in the values.');
    process.exit(1);
  }
  if (env.jwtSecret.length < 16) {
    console.warn('Warning: JWT_SECRET is short. Use a long random string outside of local development.');
  }
}
