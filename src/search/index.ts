import express from "express";
import { WebPageRepo } from "../database/index";
import { Or, Raw } from "typeorm";
import path from "path";

export function start() {
  const app = express();

  app.get("/:search?", (req, res) => {
    res.sendFile(path.join(__dirname, "../../src/search/public/index.html"));
  });

  app.get("/search/:query", async (req, res) => {
    const { query } = req.params;
    const { page } = req.query as { page: string };
    const limit = 10;
    const offset = (parseInt(page || "1", 10) - 1) * limit;
    const querySplit = query.split(" ");
    const startTime = new Date();

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

    res.send({
      data,
      time: searchTime,
      current: parseInt(page, 10),
      total: totalPages,
    });
  });

  app.listen(3000, () => console.log(`listening on port 3000`));
}
