import { parentPort } from "worker_threads";
import axios from "axios";
import { parse } from "node-html-parser";
import Robot, { Robot as IRobot } from "robots-parser";

if (parentPort) {
  parentPort.on("message", async (url) => {
    try {
      const res = await axios.get(url);
      const robots: Record<string, IRobot> = {};
      const dom = parse(res.data);

      const queue = (
        await filter(
          dom.querySelectorAll("a").map((link) => {
            return new URL(link.attributes.href, url);
          }),
          async (link: URL) => {
            if (link.toString() == url) {
              return false;
            }
            try {
              let robot = robots[link.origin];
              if (!robot) {
                const robotTxt = (await axios.get(`${link.origin}/robots.txt`)).data;
                robot = Robot(link.origin, robotTxt);
                robots[link.origin] = robot;
              }

              if (robot.isDisallowed(link.toString(), "loogle") === true) {
                return false;
              }
            } catch {}
            return true;
          }
        )
      ).map((v) => v.toString());

      const title = dom.querySelector("title")?.innerText;
      const keywords = dom
        .querySelectorAll("h1")
        .map((v) => v.innerText)
        .concat(dom.querySelectorAll("h2").map((v) => v.innerText))
        .filter((v) => !["", " "].includes(v));

      const data = { url, keywords, queue, title };
      parentPort?.postMessage(data);
    } catch (e) {
      console.error(e);
    }
  });
}

async function filter(arr: any[], callback: Function) {
  const fail = Symbol();
  return (await Promise.all(arr.map(async (item) => ((await callback(item)) ? item : fail)))).filter((i) => i !== fail);
}
