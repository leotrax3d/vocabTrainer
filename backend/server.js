/* ============================================================
   Vokabeltrainer – Backend
   REST-API über einer PostgreSQL-Datenbank. Hält ALLE Daten
   serverseitig: Profil (Name/XP/Streak/Einstellungen), Gruppen,
   Vokabeln und das 6-Phasen-Leitner-System (pro Vokabel ein
   eigenes Fälligkeitsdatum next_review).
   ============================================================ */
import express from "express";
import pg from "pg";
import { readFile } from "node:fs/promises";

const { Pool } = pg;

const PORT = Number(process.env.PORT) || 3000;

const pool = new Pool({
  host: process.env.PGHOST || "db",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "vocab",
  password: process.env.PGPASSWORD || "vocab",
  database: process.env.PGDATABASE || "vocab",
  max: 10,
});

let dbReady = false;

/* ---------- Leitner-System (6 Phasen) ----------
   Feste, größer werdende Abstände bis zur nächsten Fälligkeit.
   Phase 1: 1 Tag · 2: 2 · 3: 4 · 4: 7 · 5: 14 · 6: 30 (gefestigt). */
const PHASE_DAYS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14, 6: 30 };
const MAX_PHASE = 6;
const XP_PER_CORRECT = 10;   // Erfahrungspunkte je gewusster Vokabel

/* ---------- Schema ---------- */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS profile (
  id               INTEGER PRIMARY KEY DEFAULT 1,
  name             TEXT,
  xp               INTEGER NOT NULL DEFAULT 0,
  streak_current   INTEGER NOT NULL DEFAULT 0,
  streak_longest   INTEGER NOT NULL DEFAULT 0,
  last_learned_day DATE,
  settings         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS groups (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vocab (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  latin       TEXT NOT NULL,
  german      TEXT NOT NULL,
  forms       TEXT NOT NULL DEFAULT '',
  fav         BOOLEAN NOT NULL DEFAULT false,
  done        BOOLEAN NOT NULL DEFAULT false,
  phase       INTEGER NOT NULL DEFAULT 1,
  next_review DATE NOT NULL DEFAULT CURRENT_DATE,
  seen        INTEGER NOT NULL DEFAULT 0,
  correct     INTEGER NOT NULL DEFAULT 0,
  wrong       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vocab_group ON vocab(group_id);
CREATE INDEX IF NOT EXISTS idx_vocab_due ON vocab(next_review);

CREATE TABLE IF NOT EXISTS daily_stats (
  day     DATE PRIMARY KEY,
  learned INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  wrong   INTEGER NOT NULL DEFAULT 0
);

INSERT INTO profile (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
`;

/* ---------- Helfer ---------- */
function clean(s) { return String(s ?? "").trim(); }

function cleanItems(vocab) {
  if (!Array.isArray(vocab)) return [];
  return vocab
    .map((v) => ({
      latin: clean(v?.latin),
      german: clean(v?.german),
      forms: clean(v?.forms),
      fav: !!v?.fav,
    }))
    .filter((v) => v.latin && v.german);
}

// Vokabel-Zeile in das vom Frontend erwartete Format bringen.
function rowToVocab(r) {
  return {
    id: r.id,
    groupId: r.group_id,
    groupName: r.group_name || null,
    latin: r.latin,
    german: r.german,
    forms: r.forms,
    fav: r.fav,
    done: r.done,
    phase: r.phase,
    nextReview: r.next_review_iso || (r.next_review instanceof Date ? r.next_review.toISOString().slice(0, 10) : r.next_review),
    due: r.due,
    seen: r.seen,
    correct: r.correct,
    wrong: r.wrong,
  };
}

const VOCAB_SELECT = `
  SELECT v.*, g.name AS group_name,
         to_char(v.next_review, 'YYYY-MM-DD') AS next_review_iso,
         (v.next_review <= CURRENT_DATE) AS due
  FROM vocab v LEFT JOIN groups g ON g.id = v.group_id`;

async function getAllVocab(runner = pool) {
  const { rows } = await runner.query(`${VOCAB_SELECT} ORDER BY v.id ASC`);
  return rows.map(rowToVocab);
}

async function getGroups(runner = pool) {
  const { rows } = await runner.query(`
    SELECT g.id, g.name,
           COUNT(v.id)::int AS count,
           COUNT(v.id) FILTER (WHERE v.next_review <= CURRENT_DATE)::int AS due
    FROM groups g LEFT JOIN vocab v ON v.group_id = g.id
    GROUP BY g.id
    ORDER BY g.name ASC
  `);
  return rows;
}

async function getProfile(runner = pool) {
  const { rows } = await runner.query("SELECT * FROM profile WHERE id = 1");
  const p = rows[0] || {};
  return {
    name: p.name || null,
    onboarded: !!p.name,
    xp: p.xp || 0,
    streakCurrent: p.streak_current || 0,
    streakLongest: p.streak_longest || 0,
    settings: p.settings || {},
  };
}

async function getStats(runner = pool) {
  const phases = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const ph = await runner.query("SELECT phase, COUNT(*)::int AS n FROM vocab GROUP BY phase");
  ph.rows.forEach((r) => { phases[r.phase] = r.n; });

  const tot = await runner.query(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE next_review <= CURRENT_DATE)::int AS due_today,
           COALESCE(SUM(seen),0)::int AS seen,
           COALESCE(SUM(correct),0)::int AS correct,
           COALESCE(SUM(wrong),0)::int AS wrong
    FROM vocab`);
  const t = tot.rows[0];

  const today = await runner.query(
    "SELECT learned, correct, wrong FROM daily_stats WHERE day = CURRENT_DATE");
  const td = today.rows[0] || { learned: 0, correct: 0, wrong: 0 };

  const days = await runner.query(`
    SELECT to_char(day,'YYYY-MM-DD') AS day, learned, correct, wrong
    FROM daily_stats
    WHERE day >= CURRENT_DATE - INTERVAL '13 days'
    ORDER BY day ASC`);

  const prof = await getProfile(runner);
  return {
    phases,
    total: t.total,
    dueToday: t.due_today,
    learnedTotal: t.correct,
    answered: t.seen,
    accuracy: t.seen ? Math.round((t.correct / t.seen) * 100) : 0,
    xp: prof.xp,
    streakCurrent: prof.streakCurrent,
    streakLongest: prof.streakLongest,
    today: { learned: td.learned, correct: td.correct, wrong: td.wrong },
    days: days.rows,
  };
}

// Gruppe auflösen: per ID, per Name (anlegen falls neu) oder null.
async function resolveGroupId(client, { groupId, groupName }) {
  if (groupId != null && groupId !== "") {
    const r = await client.query("SELECT id FROM groups WHERE id = $1", [Number(groupId)]);
    if (r.rowCount) return r.rows[0].id;
  }
  const name = clean(groupName);
  if (name) {
    const r = await client.query(
      "INSERT INTO groups (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      [name]);
    return r.rows[0].id;
  }
  return null;
}

// Tagesstatistik + Streak + XP bei einer Antwort fortschreiben.
// Die Datums-Logik (heute / gestern) läuft komplett in SQL (CURRENT_DATE),
// damit es unabhängig von der Zeitzone des Node-Prozesses korrekt ist.
async function recordActivity(client, correct) {
  await client.query(`
    INSERT INTO daily_stats (day, learned, correct, wrong)
    VALUES (CURRENT_DATE, $1, $2, $3)
    ON CONFLICT (day) DO UPDATE SET
      learned = daily_stats.learned + EXCLUDED.learned,
      correct = daily_stats.correct + EXCLUDED.correct,
      wrong   = daily_stats.wrong   + EXCLUDED.wrong`,
    [correct ? 1 : 0, correct ? 1 : 0, correct ? 0 : 1]);

  // Streak: am selben Tag unverändert, nach genau einem Tag +1, sonst Reset auf 1.
  const xpGain = correct ? XP_PER_CORRECT : 0;
  await client.query(`
    UPDATE profile SET
      streak_current = CASE
        WHEN last_learned_day = CURRENT_DATE THEN streak_current
        WHEN last_learned_day = CURRENT_DATE - 1 THEN streak_current + 1
        ELSE 1 END,
      streak_longest = GREATEST(streak_longest, CASE
        WHEN last_learned_day = CURRENT_DATE THEN streak_current
        WHEN last_learned_day = CURRENT_DATE - 1 THEN streak_current + 1
        ELSE 1 END),
      last_learned_day = CURRENT_DATE,
      xp = xp + $1
    WHERE id = 1`, [xpGain]);
}

/* ---------- Seed ---------- */
async function seedIfEmpty() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM vocab");
  if (rows[0].n > 0) return;
  const seed = JSON.parse(await readFile(new URL("./seed.json", import.meta.url), "utf8"));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const gid = await resolveGroupId(client, { groupName: seed.group || "Lektion 1" });
    for (const v of cleanItems(seed.vocab || [])) {
      await client.query(
        "INSERT INTO vocab (group_id, latin, german, forms, fav) VALUES ($1,$2,$3,$4,$5)",
        [gid, v.latin, v.german, v.forms, v.fav]);
    }
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

async function initDbWithRetry() {
  const delays = [1000, 2000, 3000, 5000, 8000];
  for (let attempt = 0; ; attempt++) {
    try { await initDb(); return; }
    catch (e) {
      const wait = delays[Math.min(attempt, delays.length - 1)];
      console.warn(`[db] noch nicht bereit (${e.code || e.message}); neuer Versuch in ${wait} ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/* ---------- HTTP-API ---------- */
const app = express();
app.use(express.json({ limit: "5mb" }));

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => { console.error(err); res.status(500).json({ error: "Serverfehler" }); });

app.get("/api/health", (req, res) => res.json({ status: dbReady ? "ok" : "starting", db: dbReady }));

// Kompletter Anwendungszustand in einem Aufruf (Bootstrap beim Start).
app.get("/api/bootstrap", wrap(async (req, res) => {
  const [profile, groups, vocab, stats] = await Promise.all([
    getProfile(), getGroups(), getAllVocab(), getStats(),
  ]);
  res.json({ profile, groups, vocab, stats });
}));

/* ----- Profil / Onboarding / Einstellungen ----- */
app.get("/api/profile", wrap(async (req, res) => res.json(await getProfile())));

app.put("/api/profile", wrap(async (req, res) => {
  const sets = [], vals = [];
  if (typeof req.body?.name === "string") { sets.push(`name = $${vals.push(clean(req.body.name))}`); }
  if (req.body?.settings && typeof req.body.settings === "object") {
    // Einstellungen zusammenführen (merge), nicht ersetzen.
    sets.push(`settings = profile.settings || $${vals.push(JSON.stringify(req.body.settings))}::jsonb`);
  }
  if (sets.length) await pool.query(`UPDATE profile SET ${sets.join(", ")} WHERE id = 1`, vals);
  res.json(await getProfile());
}));

/* ----- Gruppen / Lektionen ----- */
app.get("/api/groups", wrap(async (req, res) => res.json(await getGroups())));

app.post("/api/groups", wrap(async (req, res) => {
  const name = clean(req.body?.name);
  if (!name) return res.status(400).json({ error: "Name fehlt" });
  const r = await pool.query(
    "INSERT INTO groups (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name", [name]);
  res.status(201).json(r.rows[0]);
}));

app.delete("/api/groups/:id", wrap(async (req, res) => {
  const r = await pool.query("DELETE FROM groups WHERE id = $1", [Number(req.params.id)]);
  if (!r.rowCount) return res.status(404).json({ error: "Gruppe nicht gefunden" });
  res.json({ ok: true });   // Vokabeln bleiben erhalten (group_id -> NULL)
}));

/* ----- Vokabeln ----- */
app.get("/api/vocab", wrap(async (req, res) => res.json(await getAllVocab())));

async function fetchVocab(id, runner = pool) {
  const { rows } = await runner.query(`${VOCAB_SELECT} WHERE v.id = $1`, [id]);
  return rows.length ? rowToVocab(rows[0]) : null;
}

app.post("/api/vocab", wrap(async (req, res) => {
  const latin = clean(req.body?.latin), german = clean(req.body?.german);
  if (!latin || !german) return res.status(400).json({ error: "Latein und Deutsch sind Pflicht" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const gid = await resolveGroupId(client, { groupId: req.body?.groupId, groupName: req.body?.groupName });
    const ins = await client.query(
      "INSERT INTO vocab (group_id, latin, german, forms, fav) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [gid, latin, german, clean(req.body?.forms), !!req.body?.fav]);
    await client.query("COMMIT");
    res.status(201).json(await fetchVocab(ins.rows[0].id));
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}));

app.put("/api/vocab/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const exists = await client.query("SELECT id FROM vocab WHERE id = $1", [id]);
    if (!exists.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Vokabel nicht gefunden" }); }
    const sets = [], vals = [];
    const b = req.body || {};
    if (typeof b.latin === "string") sets.push(`latin = $${vals.push(clean(b.latin))}`);
    if (typeof b.german === "string") sets.push(`german = $${vals.push(clean(b.german))}`);
    if (typeof b.forms === "string") sets.push(`forms = $${vals.push(clean(b.forms))}`);
    if (typeof b.fav === "boolean") sets.push(`fav = $${vals.push(b.fav)}`);
    if (typeof b.done === "boolean") sets.push(`done = $${vals.push(b.done)}`);
    if ("groupId" in b || "groupName" in b) {
      const gid = await resolveGroupId(client, { groupId: b.groupId, groupName: b.groupName });
      sets.push(`group_id = $${vals.push(gid)}`);
    }
    if (sets.length) { vals.push(id); await client.query(`UPDATE vocab SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals); }
    await client.query("COMMIT");
    res.json(await fetchVocab(id));
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}));

app.delete("/api/vocab/:id", wrap(async (req, res) => {
  const r = await pool.query("DELETE FROM vocab WHERE id = $1", [Number(req.params.id)]);
  if (!r.rowCount) return res.status(404).json({ error: "Vokabel nicht gefunden" });
  res.json({ ok: true });
}));

// Mehrere Vokabeln auf einmal abhaken / zurücksetzen.
app.put("/api/vocab-done/all", wrap(async (req, res) => {
  await pool.query("UPDATE vocab SET done = $1", [!!req.body?.done]);
  res.json({ ok: true });
}));

// Bulk-Import in eine Gruppe.
app.post("/api/import", wrap(async (req, res) => {
  const items = cleanItems(req.body?.vocab);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const gid = await resolveGroupId(client, { groupName: req.body?.groupName || "Import" });
    for (const v of items) {
      await client.query(
        "INSERT INTO vocab (group_id, latin, german, forms, fav) VALUES ($1,$2,$3,$4,$5)",
        [gid, v.latin, v.german, v.forms, v.fav]);
    }
    await client.query("COMMIT");
    res.status(201).json({ imported: items.length });
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}));

/* ----- Abfrage / Leitner ----- */

// Fälliger Lern-Pool: alle Vokabeln mit next_review <= heute, komplett
// gemischt (quer über alle Phasen).
app.get("/api/review/due", wrap(async (req, res) => {
  const where = ["v.next_review <= CURRENT_DATE"];
  const vals = [];
  if (req.query.group) { where.push(`v.group_id = $${vals.push(Number(req.query.group))}`); }
  if (req.query.favOnly === "1" || req.query.favOnly === "true") where.push("v.fav = true");
  const { rows } = await pool.query(
    `${VOCAB_SELECT} WHERE ${where.join(" AND ")} ORDER BY random()`, vals);
  res.json(rows.map(rowToVocab));
}));

// Antwort verbuchen: richtig -> eine Phase rauf, neues Fälligkeitsdatum
// gemäß neuer Phase. Falsch -> sofort zurück in Phase 1.
app.post("/api/review/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  const correct = !!req.body?.correct;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query("SELECT phase FROM vocab WHERE id = $1 FOR UPDATE", [id]);
    if (!cur.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Vokabel nicht gefunden" }); }
    const phase = cur.rows[0].phase;
    const newPhase = correct ? Math.min(phase + 1, MAX_PHASE) : 1;
    const days = PHASE_DAYS[newPhase];
    await client.query(
      `UPDATE vocab SET phase = $1,
         next_review = CURRENT_DATE + $2::int,
         seen = seen + 1,
         correct = correct + $3,
         wrong = wrong + $4
       WHERE id = $5`,
      [newPhase, days, correct ? 1 : 0, correct ? 0 : 1, id]);
    await recordActivity(client, correct);
    await client.query("COMMIT");
    const [vocab, profile] = await Promise.all([fetchVocab(id), getProfile()]);
    res.json({ vocab, profile });
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
}));

/* ----- Statistik ----- */
app.get("/api/stats", wrap(async (req, res) => res.json(await getStats())));

app.listen(PORT, () => console.log(`[api] läuft auf Port ${PORT}`));
initDbWithRetry();
