import { DataSource } from "typeorm";
import { env } from "../config";
import { Website } from "./entities/website.entity";
import { Queue } from "./entities/queue.entity";

export const database = new DataSource({
  type: "mysql",
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  entities: [Website, Queue],
  synchronize: true,
});

export const WebsiteRepo = database.getRepository(Website);
export const QueueRepo = database.getRepository(Queue);
