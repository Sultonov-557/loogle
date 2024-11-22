import { Like, Not } from "typeorm";
import { database, QueueRepo, WebPageRepo } from "../database";
import { Worker } from "worker_threads";

const workers: Worker[] = [];

type ScrapeData =
  | {
      success: true;
      url: string;
      title?: string;
      queue: string[];
      keywords: string;
      headers: { h1: string[]; h2: string[]; h3: string[] };
      description?: string;
    }
  | {
      success: false;
    };

const TEST_MODE = false;

let frame = 0;

export function start() {
  for (let i = 0; i < 8; i++) {
    const worker = new Worker("./dist/crawler/bot.js");
    worker.on("message", async (data: ScrapeData) => {
      if (!data.success) return;

      if (TEST_MODE) return;

      workers.push(worker);

      if (!(await WebPageRepo.existsBy({ url: data.url }))) {
        await WebPageRepo.save(
          WebPageRepo.create({
            keywords: data.keywords,
            title: data.title,
            description: data.description,
            headers: data.headers,
            url: data.url,
          })
        );
        console.log(`indexed ${data.url}`);
      }
      if (data.queue) {
        await QueueRepo.save(data.queue.map((url) => QueueRepo.create({ url })));
      }
    });
    workers.push(worker);
  }
  next();
}

async function next() {
  const worker = workers.shift();
  if (!worker) return;

  const queue =
    (await QueueRepo.find({ take: 1, where: { url: Not(Like("%en.wikipedia.org%")) } }))[0] ||
    (await QueueRepo.find({ take: 1 }))[0];
  if (queue) {
    if (!(await WebPageRepo.existsBy({ url: queue.url }))) {
      console.log(`scraping ${queue.url}`);
      worker.postMessage(queue.url);
    }

    if (!TEST_MODE) {
      await QueueRepo.delete(queue);
    }
  }

  if (frame == 20) {
    frame = 0;
    await database.query(`
      DELETE FROM queue T1
      USING webpage T2
      WHERE T1.url = T2.url
    `);
    await database.query(`
      DELETE FROM queue T1
      USING queue T2
      WHERE T1.url = T2.url
    `);
    console.log("cleaned database from dubs")
  }

  setTimeout(next, 1000);
}
