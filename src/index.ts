import "reflect-metadata";
import { database } from "./database";
import * as Crawler from "./crawler/index";

(async () => {
  await database.initialize();
  Crawler.start();
})();
