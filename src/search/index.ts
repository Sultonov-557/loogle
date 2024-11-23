import express, { Request } from "express";
import { UserRepo, WebPageRepo } from "../database/index";
import { Or, Raw } from "typeorm";
import path from "path";
import { redis } from "../database/redis";
import { hash } from "crypto";
import { sign, verify } from "jsonwebtoken";
import { env } from "../config";
import { Auth } from "./middleware";

export function start() {
  const app = express();

  app.use(express.static(path.join(__dirname, "../../src/search/public"), { extensions: ["html"] }));
  app.use(express.json());

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.send("username or password not found");
      return;
    }

    let user = await UserRepo.findOneBy({ username });
    if (!user) {
      res.send("user not found");
      return;
    }

    if (hash("sha256", password) != user?.password) {
      res.send("wrong password");
      return;
    }

    res.send({
      token: sign({ id: user.id }, env.TOKEN_SECRET),
      ...user
    });
  });

  app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.send("username or password not found");
      return;
    }

    let user = await UserRepo.findOneBy({ username });
    if (user) {
      res.send("username already used");
      return;
    }
    user = await UserRepo.save(UserRepo.create({ username, password: hash("sha256", password) }));

    res.send({
      token: sign({ id: user.id }, env.TOKEN_SECRET),
      ...user,
    });
  });

  app.get("/api/history", Auth, async (req: Request & { user?: number }, res) => {
    if (!req.user) {
      res.send("auth");
      return;
    }
    const user = await UserRepo.findOneBy({ id: req.user });
    if (!user) {
      res.send("user not found");
      return;
    }

    const history = JSON.parse(user.history);
    res.send(history);
  });

  app.get("/api/click/:id", async (req, res) => {
    const webpage = await WebPageRepo.findOneBy({ id: +req.params.id });
    if (!webpage) {
      res.redirect("/");
      return;
    }

    webpage.clicks += 1;
    WebPageRepo.save(webpage);
    res.redirect(webpage.url);
  });

  app.get("/api/search/:query", Auth, async (req: Request & { user?: number }, res) => {
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
    } else {
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
      res.send(output).end();
    }

    if (req.user) {
      const user = await UserRepo.findOneBy({ id: req.user });
      if (!user) return;
      let history: string[] = JSON.parse(user.history);
      history.push(query);
      history = Array.from(new Set(history));
      user.history = JSON.stringify(history);
      await UserRepo.save(user);
    }
  });

  app.get("/:search?", (_, res) => {
    res.sendFile(path.join(__dirname, "../../src/search/public/index.html"));
  });

  app.listen(3000, () => console.log(`listening on port 3000`));
}
