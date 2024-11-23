import { DataSource } from "typeorm";
import { env } from "../config";
import { Webpage } from "./entities/webpage.entity";
import { Queue } from "./entities/queue.entity";
import { User } from "./entities/user.entity";

export const database = new DataSource({
  type: "postgres",
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  entities: [Webpage, Queue, User],
  synchronize: true,
});

export const WebPageRepo = database.getRepository(Webpage);
export const QueueRepo = database.getRepository(Queue);
export const UserRepo = database.getRepository(User);
