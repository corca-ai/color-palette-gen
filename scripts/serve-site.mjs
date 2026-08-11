import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const root = process.env.SITE_ROOT ?? "dist";
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url, "http://local").pathname,
  );
  const relative = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  let target = join(root, relative);
  try {
    if ((await stat(target)).isDirectory()) target = join(target, "index.html");
    response.writeHead(200, {
      "Content-Type": types[extname(target)] ?? "application/octet-stream",
    });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});
