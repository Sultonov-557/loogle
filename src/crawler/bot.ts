import { parentPort } from "worker_threads";
import axios from "axios";
import { parse } from "node-html-parser";

const forbiddenWebsites = [
  "web.archive.org",
  "gs.statcounter.com",
  "wikibooks.org",
  "wikiversity.org",
  "wikidata.org",
  "https://en.wikipedia.org/wiki/Wikipedia",
  "https://en.wikipedia.org/wiki/Special",
];

const allowedSubdomains = ["en", "www", "news", "developers"];

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

      const keywords = meta.keywords;

      const headers = {
        h1: dom.querySelectorAll("h1").map((v) => v.innerText),
        h2: dom.querySelectorAll("h2").map((v) => v.innerText),
        h3: dom.querySelectorAll("h3").map((v) => v.innerText),
      };

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
              link.pathname.endsWith(".php") ||
              !["com", "org"].includes(link.hostname.split(".").at(-1) || "") ||
              !forbiddenWebsites.every((v) => !link.toString().includes(v)) ||
              link.toString().replace(link.hash, "") == new URL(url).toString().replace(new URL(url).hash, "")
            ) {
              return false;
            }

            if (link.hostname.split(".").length == 3) {
              const subdomain = link.hostname.split(".")[0];
              if (!allowedSubdomains.includes(subdomain)) {
                return false;
              }
            }

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
        headers,
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
  return (await Promise.all(arr.map(async (item) => ((await callback(item)) ? item : fail)))).filter((i) => i !== fail);
}
