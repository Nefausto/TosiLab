const { randomUUID, createHash, timingSafeEqual } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const holdMinutes = 30;
const clock = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short"
});

function validDay(day) {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(day + "T00:00:00Z");
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === day;
}

function schedule(day, now) {
  const weekday = new Date(day + "T00:00:00Z").getUTCDay();
  const [today, time] = clock.format(now).split(" ");
  if (!weekday || day < today) return [];
  const last = weekday === 6 ? 16 : 14;
  return Array.from({ length: last - 8 }, (_, index) =>
    String(index + 9).padStart(2, "0") + ":00")
    .filter(slot => day > today || slot > time);
}

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 4096) throw new Error("Body too large");
  }
  return JSON.parse(body);
}

function digest(value) {
  return createHash("sha256").update(value).digest();
}

function createAgenda(filename, adminKey) {
  const database = new DatabaseSync(filename);
  database.exec(`
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'blocked')),
      expires INTEGER,
      UNIQUE (day, time)
    );
  `);
  const dayRows = database.prepare("SELECT id, time, status FROM appointments WHERE day = ? ORDER BY time");
  const insert = database.prepare("INSERT OR IGNORE INTO appointments VALUES (?, ?, ?, ?, ?)");
  const confirm = database.prepare("UPDATE appointments SET status = 'confirmed', expires = NULL WHERE day = ? AND id = ? AND status = 'pending'");
  const remove = database.prepare("DELETE FROM appointments WHERE day = ? AND id = ?");
  const keyHash = digest(adminKey);

  return async function handleAgenda(request, response, url) {
    const admin = url.pathname === "/api/agenda/admin";
    const availability = url.pathname === "/api/agenda/availability";
    const hold = url.pathname === "/api/agenda/hold";
    if (!admin && !availability && !hold) return json(response, 404, { error: "not_found" });
    if (admin && !timingSafeEqual(keyHash, digest(request.headers.authorization || ""))) {
      return json(response, 401, { error: "unauthorized" });
    }
    const get = request.method === "GET";
    if ((get && hold) || (!get && (request.method !== "POST" || availability))) {
      return json(response, 405, { error: "method" });
    }
    let input;
    try {
      input = get ? { day: url.searchParams.get("day") } : await readBody(request);
    } catch {
      return json(response, 400, { error: "input" });
    }
    if (!validDay(input?.day)) return json(response, 400, { error: "day" });
    const { day, time, action, id } = input;
    const now = new Date();
    const slots = schedule(day, now);
    const maxDay = clock.format(new Date(+now + 30 * 86400000)).split(" ")[0];
    if (!admin && day > maxDay) return json(response, 400, { error: "day" });

    database.prepare("DELETE FROM appointments WHERE status = 'pending' AND expires <= ?").run(+now);
    if (get) {
      const rows = dayRows.all(day);
      const available = slots.filter(slot => !rows.some(row => row.time === slot));
      return json(response, 200, admin ? { available, rows } : { available });
    }
    if (admin && (action === "confirm" || action === "release")) {
      if (typeof id !== "string") return json(response, 400, { error: "input" });
      const result = (action === "confirm" ? confirm : remove).run(day, id);
      return json(response, result.changes ? 200 : 409, { ok: Boolean(result.changes) });
    }
    if ((admin && action !== "block") || !slots.includes(time)) {
      return json(response, 400, { error: "slot" });
    }
    const bookingId = randomUUID();
    const status = admin ? "blocked" : "pending";
    const expires = admin ? null : +now + holdMinutes * 60000;
    const result = insert.run(bookingId, day, time, status, expires);
    if (!result.changes) return json(response, 409, { error: "unavailable" });
    return json(response, 201, { id: bookingId, holdMinutes });
  };
}

module.exports = { createAgenda, json };
