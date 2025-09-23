import * as dotenv from 'dotenv';
dotenv.config();

export const ENVIRONMENT = {
  APP: {
    NAME: process.env.APP_NAME ?? 'Sylis',
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    ENV: process.env.APP_ENV ?? 'development',
    JWT_SECRET: process.env.JWT_SECRET ?? 'default-secret-change-in-production',
  },
  DB: {
    URL: process.env.DB_URL ?? 'mongodb://localhost:27017/zawadi',
  },
  EMAIL: {
    HOST: process.env.EMAIL_HOST ?? 'smtp.gmail.com',
    PORT: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
    SECURE: process.env.EMAIL_SECURE === 'true',
    USER: process.env.EMAIL_USER ?? '',
    PASS: process.env.EMAIL_PASS ?? '',
  },
  BLOCKCHAIN: {
    RPC_URL: process.env.RPC_URL ?? 'http://localhost:8545',
    CHAIN_ID: process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 31337,
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS ?? '',
  },
  PINATA: {
    API_KEY: process.env.PINATA_API_KEY ?? '',
    API_SECRET: process.env.PINATA_API_SECRET ?? '',
    JWT: process.env.PINATA_JWT ?? '',
    GATEWAY_URL: process.env.PINATA_GATEWAY_URL ?? '',
  },
};
