# Audio-Vokabeltrainer

Ein Vokabeltrainer fürs Ohr – speziell für Latein. Jede Vokabel wird
vorgelesen: **erst die lateinische Form, dann eine Pause, dann die deutsche
Übersetzung**. So kannst du mitlernen, ohne auf den Bildschirm schauen zu
müssen (z. B. unterwegs).

Die App läuft komplett im Browser. Es gibt keinen Server, keine Anmeldung,
keine Tracking. Deine Vokabeln werden lokal im Browser gespeichert.

## Funktionen

- **Audio-Wiedergabe** pro Vokabel: Latein → 5 s Pause → Deutsch
  (jede Pausenlänge einzeln einstellbar).
- **Drei Spalten** je Vokabel: lateinische Grundform, deutsche Übersetzung,
  weitere Formen (z. B. `carnis, f.`).
- **Einstellbare Pausen** zwischen allen Teilen: vor den Formen, zwischen
  Latein und Deutsch sowie nach jeder Vokabel.
- **Signalton** (optional) zu Beginn jeder Vokabel.
- **Vokabelliste mit Abhaken** – abgehakte Vokabeln werden beim Abspielen
  übersprungen (lässt sich abschalten).
- **Sortierung** der Liste: Reihenfolge, Latein A–Z, Deutsch A–Z oder offene
  Vokabeln zuerst.
- **Import & Export als JSON** – Vokabellisten sichern und weitergeben.
- **Einzelne Vokabeln** abspielen, bearbeiten, löschen oder neu hinzufügen.
- **Stimmen wählbar**: für Latein klingt eine *italienische* Stimme am
  natürlichsten, Deutsch separat einstellbar; Sprechtempo regelbar.
- **Komfort**: Zufallsreihenfolge, Endlos-Wiederholung, Formen vorlesen,
  Latein mehrfach wiederholen, Suche.
- **Helles & dunkles Design**, zurückhaltend gestaltet und voll **mobil-tauglich**.
- **Tastatur**: `Leertaste` = Play/Pause, `←` / `→` = blättern.

## Lokal starten

Einfach `index.html` im Browser öffnen – fertig. (Empfohlen: Chrome, Edge
oder Safari; die Sprachausgabe nutzt die im Betriebssystem installierten
Stimmen.)

Wer einen lokalen Server bevorzugt:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Auf GitHub Pages veröffentlichen

Es liegt bereits ein Workflow (`.github/workflows/deploy.yml`) bei, der die
Seite bei jedem Push auf `main` automatisch veröffentlicht.

1. Code nach GitHub pushen (Branch `main`).
2. Im Repository: **Settings → Pages → Build and deployment → Source:
   „GitHub Actions“** auswählen.
3. Fertig. Nach dem nächsten Push ist die Seite erreichbar unter:
   `https://<dein-benutzername>.github.io/<repo-name>/`

Alternativ ohne Actions: **Settings → Pages → Source: „Deploy from a branch“
→ Branch `main` / `/root`**.

## JSON-Format

```json
{
  "title": "Latein · Lektion 1",
  "vocab": [
    { "latin": "caro", "german": "das Fleisch", "forms": "carnis, f." }
  ]
}
```

- `latin` – lateinische Grundform (wird zuerst vorgelesen) — Pflicht
- `german` – deutsche Übersetzung (wird nach der Pause vorgelesen) — Pflicht
- `forms` – weitere Formen, optional (nur Anzeige; auf Wunsch mit vorlesbar)
- `done` – optional `true`/`false`, ob die Vokabel abgehakt ist

Ein reines Array (ohne `title`-Hülle) wird beim Import ebenfalls akzeptiert.
Eine Beispieldatei liegt als [`beispiel-vokabeln.json`](beispiel-vokabeln.json) bei.

## Technik

Reines HTML/CSS/JavaScript ohne Build-Schritt oder Abhängigkeiten. Die
Sprachausgabe nutzt die [Web Speech API](https://developer.mozilla.org/de/docs/Web/API/Web_Speech_API)
des Browsers.

> Hinweis: Es gibt kaum echte *lateinische* TTS-Stimmen. Italienisch kommt
> der klassischen/kirchlichen Aussprache am nächsten und ist daher
> voreingestellt. Welche Stimmen verfügbar sind, hängt vom Betriebssystem ab.
