import * as dotenv from "dotenv";
dotenv.config();

export const ENVIRONMENT = {
  APP: {
    NAME: process.env.APP_NAME ?? "Zawadi",
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    ENV: process.env.APP_ENV ?? "development",
  },
  PINATA: {
    API_KEY: process.env.PINATA_API_KEY ?? "",
    API_SECRET: process.env.PINATA_API_SECRET ?? "",
    JWT: process.env.PINATA_JWT ?? "",
    GATEWAY_URL: process.env.PINATA_GATEWAY_URL ?? "",
  },
};
