const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
  ["/assets/logo-tosilab.png", ["assets/logo-tosilab.png", "image/png"]],
  ["/assets/hero-masaje-terapeutico.png", ["assets/hero-masaje-terapeutico.png", "image/png"]]
]);

const port = Number(process.env.TOSILAB_PORT || 5184);

http.createServer(async (request, response) => {
  const file = files.get(request.url.split("?")[0]);
  if (!file || !["GET", "HEAD"].includes(request.method)) {
    response.writeHead(404).end();
    return;
  }

  try {
    const [filename, type] = file;
    const content = await readFile(path.join(__dirname, filename));
    response.writeHead(200, { "Content-Type": type, "Content-Length": content.length });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(500).end();
  }
}).listen(port, "127.0.0.1");
