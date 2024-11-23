import { config } from "dotenv";
import { cleanEnv, num, str } from "envalid";

config();

export const env = cleanEnv(process.env, {
  PORT: num(),
  TOKEN_SECRET: str(),
  DB_HOST: str(),
  DB_PORT: num(),
  DB_USER: str(),
  DB_PASS: str(),
  DB_NAME: str(),
});
