import "reflect-metadata";
import { database } from "./database";
import * as Crawler from "./crawler/index";
import * as Search from "./search/index";

(async () => {
  await database.initialize();
  Crawler.start();
  Search.start();
})();
