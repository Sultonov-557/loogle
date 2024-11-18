import { parentPort } from "worker_threads";
import axios from "axios";
import { parse } from "node-html-parser";
import Robot, { Robot as IRobot } from "robots-parser";
import fs from "fs";

const robotFiles = fs.readdirSync("./robots");

const robots: Record<string, IRobot> = {};
robotFiles.forEach((filename) => {
	const file = fs.readFileSync(`./robots/${filename}`).toString();
	const url = filename.replace(".txt", "");
	robots[url] = Robot(url, file);
});

if (parentPort) {
	parentPort.on("message", async (url: any) => {
		try {
			const res = await axios.get(url);
			const dom = parse(res.data);

			const title = dom.querySelector("title")?.innerText;
			const meta: Record<string, string> = {};
			dom.querySelectorAll("meta").forEach((v) => {
				meta[v.attributes.name] = v.attributes.content;
			});

			const keywords = dom
				.querySelectorAll("h1")
				.map((v) => v.innerText)
				.concat(
					dom.querySelectorAll("h2").map((v) => v.innerText),
					meta.keywords
				)
				.filter((v) => !["", " "].includes(v));

			const queue = (
				await filter(
					dom.querySelectorAll("a").map((link) => {
						return new URL(link.attributes.href, url);
					}),
					async (link: URL) => {
						if (
							link.toString() == url ||
							link.hostname.startsWith("api.") ||
							link.hostname.startsWith("id.") ||
							link.pathname.endsWith(".pdf") ||
							["web.archive.org", "gs.statcounter.com"].includes(
								link.hostname
							)
						) {
							return false;
						}
						try {
							let robot = robots[link.hostname];
							if (!robot) {
								const robotTxt = (
									await axios.get(`${link.origin}/robots.txt`)
								).data;
								robot = Robot(link.origin, robotTxt);
								robots[link.hostname] = robot;
								fs.writeFileSync(
									`./robots/${link.hostname}.txt`,
									robotTxt
								);
							}

							if (
								robot &&
								robot.isDisallowed(link.toString(), "loogle") === true
							) {
								return false;
							}
						} catch {}
						return true;
					}
				)
			).map((v) => v.toString());

			const data = {
				success: true,
				url,
				keywords,
				queue,
				title,
				description: meta.description,
			};
			parentPort?.postMessage(data);
		} catch (e) {
			console.error(`error when scraping ${url}`);
			parentPort?.postMessage({ success: false });
		}
	});
}

async function filter(arr: any[], callback: Function) {
	const fail = Symbol();
	return (
		await Promise.all(arr.map(async (item) => ((await callback(item)) ? item : fail)))
	).filter((i) => i !== fail);
}
