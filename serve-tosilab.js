const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { createAgenda, json } = require("./agenda");
const adminKey = process.env.TOSILAB_AGENDA_KEY;
const agenda = adminKey ? createAgenda(
  process.env.TOSILAB_AGENDA_DB || path.join(__dirname, ".tosilab-agenda.sqlite"),
  "Bearer " + adminKey
) : null;

const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
  ["/agenda", ["agenda.html", "text/html; charset=utf-8"]],
  ["/agenda-admin.js", ["agenda-admin.js", "text/javascript; charset=utf-8"]],
  ["/assets/logo-tosilab.png", ["assets/logo-tosilab.png", "image/png"]],
  ["/assets/hero-masaje-terapeutico.png", ["assets/hero-masaje-terapeutico.png", "image/png"]]
]);

const port = Number(process.env.TOSILAB_PORT || 5184);

http.createServer(async (request, response) => {
  const route = request.url.split("?")[0];
  if (route.startsWith("/api/agenda/")) {
    try {
      if (!agenda) return json(response, 503, { error: "agenda_disabled" });
      return await agenda(request, response, new URL(request.url, "http://localhost"));
    } catch (error) {
      console.error("Agenda request failed:", error.message);
      return json(response, 500, { error: "agenda_error" });
    }
  }
  const file = files.get(route);
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
