// Intelligent logging - disable in production, reduce in development
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  info: (msg: string) => {
    if (isProduction) return; // Silent in production
    console.log(`[INFO] ${msg}`);
  },
  error: (msg: string, err?: any) => {
    // Only log critical errors
    if (err && err.status && err.status < 500) return;
    console.error(`[ERROR] ${msg}`, err || '');
  },
  debug: (msg: string) => {
    // Disabled by default
    return;
  },
  sql: (query: string) => {
    // Disabled for performance
    return;
  }
};
