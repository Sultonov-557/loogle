import { QueueRepo, WebsiteRepo } from "../database";
import { Worker } from "worker_threads";

const workers: Worker[] = [];

type ScrapeData =
	| {
			success: true;
			url: string;
			title?: string;
			queue: string[];
			keywords: string[];
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
			if (!TEST_MODE) {
				workers.push(worker);
			}

			if (!data.success) return;

			if (!(await WebsiteRepo.existsBy({ url: data.url }))) {
				await WebsiteRepo.save(
					WebsiteRepo.create({
						keywords: data.keywords.join(" "),
						title: data.title,
						description: data.description,
						url: data.url,
					})
				);
			}
			if (data.queue) {
				await QueueRepo.save(data.queue.map((url) => QueueRepo.create({ url })));
			}

			console.log(
				`scraped: ${data.url}\nurls found:${data.queue.length}\nworkers free: ${workers.length}\n`
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
		if (!(await WebsiteRepo.existsBy({ url: queue.url }))) {
			console.log(`scraping ${queue.url}\n`);
			worker.postMessage(queue.url);
		}

		if (!TEST_MODE) {
			await QueueRepo.delete(queue);
		}
	}
	setTimeout(next, 1000);
}
