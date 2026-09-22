import 'dotenv/config';

export interface AppConfig {
  env: string;
  port: number;
  database: {
    url: string;
    authToken?: string;
  };
  jwt: {
    secret: string;
  };
  smtp: {
    user?: string;
    pass?: string;
    host: string;
    port: number;
  };
  groq: {
    apiKey?: string;
  };
}

export const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  database: {
    url: process.env.DATABASE_URL || '',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret-jwt-key-change-in-production',
  },
  smtp: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10),
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
  },
};

export default config;
