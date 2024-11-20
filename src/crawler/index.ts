import { Like, Not } from "typeorm";
import { QueueRepo, WebPageRepo } from "../database";
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
  const queue =
    (await QueueRepo.find({ take: 1, where: { url: Not(Like("%en.wikipedia.org%")) } }))[0] ||
    (await QueueRepo.find({ take: 1 }))[0];

  if (worker && queue) {
    if (!(await WebPageRepo.existsBy({ url: queue.url }))) {
      worker.postMessage(queue.url);
    }

    if (!TEST_MODE) {
      await QueueRepo.delete(queue);
    }
  }
  setTimeout(next, 1000);
}
