# Docker-Deployment

Dieses Setup bringt den Vokabeltrainer als vollständige 3-Schichten-Anwendung
mit **Docker Compose** in Betrieb:

| Dienst     | Technik              | Aufgabe                                             | Erreichbar |
|------------|----------------------|-----------------------------------------------------|------------|
| `frontend` | nginx                | Liefert die Web-App aus, proxyt `/api` ans Backend  | **Host-Port 6767** |
| `backend`  | Node.js + Express    | REST-API für die Vokabellisten                      | nur intern |
| `db`       | PostgreSQL 16        | Vokabeldatenbank (persistentes Volume)              | nur intern |

```
        Browser
          │  http://<host>:6767
          ▼
   ┌──────────────┐   /api/*    ┌──────────────┐   SQL    ┌──────────────┐
   │  frontend    │ ──────────▶ │   backend    │ ───────▶ │     db       │
   │  (nginx)     │             │  (Express)   │          │ (PostgreSQL) │
   └──────────────┘             └──────────────┘          └──────┬───────┘
   statische App + Proxy          REST-API                       │ Volume: vocab-db
```

Das Frontend und die API laufen unter **demselben Origin** (Port 6767). nginx
reicht alle `/api`-Anfragen intern an das Backend weiter – dadurch ist **kein
CORS** nötig und das Backend muss nicht nach außen geöffnet werden.

## Voraussetzungen

- Docker und Docker Compose (Docker Desktop oder `docker` + Compose-Plugin)

## Bauen & Starten

```bash
# Images bauen und alle Container im Hintergrund starten
docker compose up -d --build

# App im Browser öffnen
#   http://localhost:6767
```

Beim ersten Start legt das Backend automatisch das Datenbank-Schema an und
spielt eine Beispiel-Vokabelliste ein.

## Befehlsübersicht

```bash
docker compose up -d --build     # bauen + starten (Hintergrund)
docker compose up --build        # bauen + starten (Logs im Vordergrund)
docker compose ps                # Status der Container
docker compose logs -f           # Logs aller Dienste folgen
docker compose logs -f backend   # nur Backend-Logs
docker compose stop              # Container stoppen (Daten bleiben erhalten)
docker compose start             # gestoppte Container wieder starten
docker compose restart backend   # einen Dienst neu starten
docker compose down              # Container entfernen (Volume/Daten bleiben!)
docker compose down -v           # Container UND Datenbank-Volume löschen
docker compose build --no-cache  # Images komplett neu bauen
```

## Daten & Persistenz

Die Vokabeln liegen in PostgreSQL, dessen Datenverzeichnis im benannten
Docker-Volume **`vocab-db`** liegt. Die Daten überleben damit
`docker compose down`, Updates und Neustarts.

```bash
docker volume ls                       # Volumes anzeigen (u. a. vokabeltrainer_vocab-db)
docker compose down -v                 # ACHTUNG: löscht die Datenbank endgültig
```

## Konfiguration

Standardwerte funktionieren ohne weitere Einstellungen. Anpassen lässt sich u. a.:

- **Externer Port:** in `docker-compose.yml` unter `frontend.ports`
  (`"6767:80"`) die linke Zahl ändern.
- **Datenbank-Zugang:** Umgebungsvariablen `POSTGRES_USER`,
  `POSTGRES_PASSWORD`, `POSTGRES_DB` (z. B. über eine `.env`-Datei neben der
  `docker-compose.yml`). Für einen echten Server bitte ein eigenes Passwort
  setzen.

Beispiel `.env`:

```env
POSTGRES_USER=vocab
POSTGRES_PASSWORD=bitte-aendern
POSTGRES_DB=vocab
```

## Nutzung im Browser

Im Tab **Vokabeln** erscheint mit laufendem Backend der Bereich
**„Server-Vokabeln"**:

- **Aktuelle Liste auf Server speichern** – legt die geladene Liste in der
  Datenbank ab.
- **Laden** / **Löschen** je gespeicherter Liste.
- **Geladene Liste aktualisieren** – speichert Änderungen zur gerade
  geladenen Server-Liste zurück.

> Ohne erreichbares Backend (z. B. die statische GitHub-Pages-Variante)
> blendet die App diesen Bereich automatisch aus und funktioniert wie gewohnt
> rein lokal im Browser.
