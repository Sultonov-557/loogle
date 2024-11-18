import { QueueRepo, WebsiteRepo } from "../database";
import { Worker } from "worker_threads";

const workers: Worker[] = [];

type ScrapeData = { url: string; title: string; queue: string[]; keywords: string[] };

const TEST_MODE = false;

export function start() {
  for (let i = 0; i < 1; i++) {
    const worker = new Worker("./dist/crawler/bot.js");
    worker.on("message", async (data: ScrapeData) => {
      if (!TEST_MODE) {
        workers.push(worker);
      }

      if (!(await WebsiteRepo.existsBy({ url: data.url }))) {
        await WebsiteRepo.save(
          WebsiteRepo.create({ keywords: data.keywords.join(" "), title: data.title, url: data.url })
        );
      }
      await Promise.all(
        data.queue.map(async (url) => {
          if (!(await QueueRepo.existsBy({ url }))) {
            await QueueRepo.save(QueueRepo.create({ url }));
          }
        })
      );
    });
    workers.push(worker);
  }
  next();
}

async function next() {
  const worker = workers.shift();
  const queue = (await QueueRepo.find({ take: 1 }))[0];

  if (worker && queue) {
    worker.postMessage(queue.url);
    if (!TEST_MODE) {
      await QueueRepo.delete(queue);
    }
  }
  setImmediate(next);
}
