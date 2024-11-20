import express from "express";
import { WebPageRepo } from "../database/index";
import { Or, Raw } from "typeorm";
import path from "path";

export function start() {
  const app = express();

  app.get("/:search?", (req, res) => {
    res.sendFile(path.join(__dirname, "../../src/search/public/index.html"));
  });

  app.get("/search/:query/:page?", async (req, res) => {
    const query = req.params.query;
    const page = parseInt(req.params.page || "1", 10);
    const limit = 10;
    const offset = (page - 1) * limit;
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

    const endTime = new Date();
    const searchTime = endTime.getTime() - startTime.getTime(); // Corrected to use getTime() for date subtraction

    res.send({
      data,
      searchTime: searchTime,
      resultsCount: data.length,
      currentPage: page,
    });
  });

  app.listen(3000, () => console.log(`listening on port 3000`));
}
