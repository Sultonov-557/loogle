import express from "express";
import { WebPageRepo } from "../database/index";
import { Or, Raw } from "typeorm";
import path from "path";
import { redis } from "../database/redis";

export function start() {
  const app = express();

  app.get("/logo.png", (_, res) => {
    res.sendFile(path.join(__dirname, "../../src/search/public/logo.png"));
  });

  app.get("/:search?", (_, res) => {
    res.sendFile(path.join(__dirname, "../../src/search/public/index.html"));
  });

  app.get("/search/:query", async (req, res) => {
    const { query } = req.params;
    const { page } = req.query as { page: string };
    const startTime = new Date();

    const key = `${page || 1},${query}`;
    let cache: any = await redis.get(key);
    if (cache) {
      cache = JSON.parse(cache);

      const diff = Date.now() - cache.date;
      if (diff > 1000 * 60 * 60 * 24) {
        await redis.del(key);
      }

      const endTime = new Date();
      const searchTime = endTime.getTime() - startTime.getTime();
      cache.time = searchTime;

      res.send(cache);
      return;
    }

    const limit = 10;
    const offset = (parseInt(page || "1", 10) - 1) * limit;
    const querySplit = query.split(" ").filter((v) => v != "");

    const data = await WebPageRepo.find({
      where: [
        {
          keywords: Or(
            ...querySplit.map((word) => Raw((alias) => `LOWER(${alias}) Like LOWER(:value)`, { value: `%${word}%` }))
          ),
        },
        {
          description: Or(
            ...querySplit.map((word) => Raw((alias) => `LOWER(${alias}) Like LOWER(:value)`, { value: `%${word}%` }))
          ),
        },
        {
          title: Or(
            ...querySplit.map((word) => Raw((alias) => `LOWER(${alias}) Like LOWER(:value)`, { value: `%${word}%` }))
          ),
        },
      ],
      take: limit,
      skip: offset,
    });

    const totalResults = await WebPageRepo.count({
      where: [
        {
          keywords: Or(
            ...querySplit.map((word) => Raw((alias) => `LOWER(${alias}) Like LOWER(:value)`, { value: `%${word}%` }))
          ),
        },
        {
          description: Or(
            ...querySplit.map((word) => Raw((alias) => `LOWER(${alias}) Like LOWER(:value)`, { value: `%${word}%` }))
          ),
        },
        {
          title: Or(
            ...querySplit.map((word) => Raw((alias) => `LOWER(${alias}) Like LOWER(:value)`, { value: `%${word}%` }))
          ),
        },
      ],
    });

    const totalPages = Math.ceil(totalResults / limit);

    const endTime = new Date();
    const searchTime = endTime.getTime() - startTime.getTime();

    const output = {
      data,
      time: searchTime,
      current: parseInt(page, 10),
      total: totalPages,
      date: Date.now(),
    };

    await redis.set(key, JSON.stringify(output));
    res.send(output);
  });

  app.listen(3000, () => console.log(`listening on port 3000`));
}
