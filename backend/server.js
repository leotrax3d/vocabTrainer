/* ============================================================
   Vokabeltrainer – Backend
   Schlanke REST-API ueber einer PostgreSQL-Vokabeldatenbank.
   Speichert Vokabellisten serverseitig und dauerhaft.
   ============================================================ */
import express from "express";
import pg from "pg";
import { readFile } from "node:fs/promises";

const { Pool } = pg;

const PORT = Number(process.env.PORT) || 3000;

// Verbindungs-Pool zur Datenbank. Alle Werte kommen aus der Umgebung
// (siehe docker-compose.yml) und haben sinnvolle Vorgaben fuer lokal.
const pool = new Pool({
  host: process.env.PGHOST || "db",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "vocab",
  password: process.env.PGPASSWORD || "vocab",
  database: process.env.PGDATABASE || "vocab",
  max: 10,
});

let dbReady = false;

/* ---------- Schema ---------- */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS lists (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT 'Vokabelliste',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vocab (
  id        SERIAL PRIMARY KEY,
  list_id   INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL DEFAULT 0,
  latin     TEXT NOT NULL,
  german    TEXT NOT NULL,
  forms     TEXT NOT NULL DEFAULT '',
  done      BOOLEAN NOT NULL DEFAULT false,
  fav       BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_vocab_list ON vocab(list_id);
`;

/* ---------- Helfer ---------- */

// Eingehende Vokabeln saeubern: nur erlaubte Felder, getrimmt, ohne Leereintraege.
function cleanItems(vocab) {
  if (!Array.isArray(vocab)) return [];
  return vocab
    .map((v) => ({
      latin: String(v?.latin ?? "").trim(),
      german: String(v?.german ?? "").trim(),
      forms: String(v?.forms ?? "").trim(),
      done: !!v?.done,
      fav: !!v?.fav,
    }))
    .filter((v) => v.latin && v.german);
}

function cleanTitle(title) {
  const t = String(title ?? "").trim();
  return t || "Vokabelliste";
}

// Alle Vokabeln einer Liste ersetzen (innerhalb einer Transaktion aufrufen).
async function replaceVocab(client, listId, vocab) {
  await client.query("DELETE FROM vocab WHERE list_id = $1", [listId]);
  const items = cleanItems(vocab);
  for (let i = 0; i < items.length; i++) {
    const v = items[i];
    await client.query(
      `INSERT INTO vocab (list_id, position, latin, german, forms, done, fav)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [listId, i, v.latin, v.german, v.forms, v.done, v.fav]
    );
  }
  return items.length;
}

// Eine Liste samt Vokabeln in der vom Frontend erwarteten Form laden.
async function getFullList(id) {
  const l = await pool.query("SELECT id, title FROM lists WHERE id = $1", [id]);
  if (!l.rowCount) return null;
  const v = await pool.query(
    `SELECT latin, german, forms, done, fav
       FROM vocab WHERE list_id = $1
      ORDER BY position ASC, id ASC`,
    [id]
  );
  return { id: l.rows[0].id, title: l.rows[0].title, vocab: v.rows };
}

// Beim allerersten Start die Beispiel-Vokabeln einspielen, damit die
// Datenbank nicht leer ist.
async function seedIfEmpty() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM lists");
  if (rows[0].n > 0) return;
  const seed = JSON.parse(
    await readFile(new URL("./seed.json", import.meta.url), "utf8")
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      "INSERT INTO lists (title) VALUES ($1) RETURNING id",
      [cleanTitle(seed.title)]
    );
    await replaceVocab(client, ins.rows[0].id, seed.vocab || []);
    await client.query("COMMIT");
    console.log("[db] Beispiel-Vokabeln eingespielt.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function initDb() {
  await pool.query(SCHEMA);
  await seedIfEmpty();
  dbReady = true;
  console.log("[db] bereit.");
}

// Die Container starten parallel – daher mit Backoff auf die DB warten,
// statt sofort abzustuerzen.
async function initDbWithRetry() {
  const delays = [1000, 2000, 3000, 5000, 8000];
  for (let attempt = 0; ; attempt++) {
    try {
      await initDb();
      return;
    } catch (e) {
      const wait = delays[Math.min(attempt, delays.length - 1)];
      console.warn(
        `[db] noch nicht bereit (${e.code || e.message}); neuer Versuch in ${wait} ms`
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/* ---------- HTTP-API ---------- */
const app = express();
app.use(express.json({ limit: "5mb" }));

// Async-Handler mit zentralem Fehler-Fang.
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Serverfehler" });
  });

// Healthcheck (auch fuer den Docker-Healthcheck und die Frontend-Erkennung).
app.get("/api/health", (req, res) => {
  res.json({ status: dbReady ? "ok" : "starting", db: dbReady });
});

// Alle Listen (ohne Vokabeln, aber mit Anzahl).
app.get(
  "/api/lists",
  wrap(async (req, res) => {
    const { rows } = await pool.query(`
      SELECT l.id, l.title, l.updated_at, COUNT(v.id)::int AS count
        FROM lists l
        LEFT JOIN vocab v ON v.list_id = l.id
       GROUP BY l.id
       ORDER BY l.updated_at DESC, l.id DESC
    `);
    res.json(rows);
  })
);

// Eine Liste samt Vokabeln.
app.get(
  "/api/lists/:id",
  wrap(async (req, res) => {
    const list = await getFullList(Number(req.params.id));
    if (!list) return res.status(404).json({ error: "Liste nicht gefunden" });
    res.json(list);
  })
);

// Neue Liste anlegen.
app.post(
  "/api/lists",
  wrap(async (req, res) => {
    const title = cleanTitle(req.body?.title);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const ins = await client.query(
        "INSERT INTO lists (title) VALUES ($1) RETURNING id",
        [title]
      );
      const id = ins.rows[0].id;
      await replaceVocab(client, id, req.body?.vocab);
      await client.query("COMMIT");
      res.status(201).json(await getFullList(id));
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  })
);

// Bestehende Liste ersetzen (Titel + Vokabeln).
app.put(
  "/api/lists/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const exists = await pool.query("SELECT id FROM lists WHERE id = $1", [id]);
    if (!exists.rowCount)
      return res.status(404).json({ error: "Liste nicht gefunden" });
    const title = cleanTitle(req.body?.title);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE lists SET title = $1, updated_at = now() WHERE id = $2",
        [title, id]
      );
      await replaceVocab(client, id, req.body?.vocab);
      await client.query("COMMIT");
      res.json(await getFullList(id));
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  })
);

// Liste loeschen (Vokabeln folgen per ON DELETE CASCADE).
app.delete(
  "/api/lists/:id",
  wrap(async (req, res) => {
    const r = await pool.query("DELETE FROM lists WHERE id = $1", [
      Number(req.params.id),
    ]);
    if (!r.rowCount)
      return res.status(404).json({ error: "Liste nicht gefunden" });
    res.json({ ok: true });
  })
);

app.listen(PORT, () => console.log(`[api] laeuft auf Port ${PORT}`));
initDbWithRetry();
