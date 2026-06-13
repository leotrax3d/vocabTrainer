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
- **Import als JSON oder CSV** und **Export als JSON** – Vokabellisten
  sichern und weitergeben (CSV z. B. aus Tabellen oder Anki; Spalten:
  Latein, Deutsch, Formen).
- **Liste per Link teilen** – die Vokabeln werden in den Link kodiert; wer
  ihn öffnet, hat dieselbe Liste (kein Server nötig).
- **Hintergrund- & Sperrbildschirm-Wiedergabe** über die Media Session API:
  Steuerung per Kopfhörer-/Medientasten und vom Sperrbildschirm.
- **Sprachsteuerung** (Mikrofon): „gewusst“ hakt ab und springt weiter,
  „weiter“ / „zurück“ blättern, „stopp“ / „los“ pausieren bzw. starten.
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

### CSV-Format

Alternativ lässt sich eine CSV-Datei importieren – eine Zeile pro Vokabel,
Spalten in der Reihenfolge **Latein, Deutsch, Formen** (Formen optional).
Trenner `,`, `;` oder Tab werden automatisch erkannt; eine Kopfzeile mit
Bezeichnungen wie „Latein/Deutsch“ wird übersprungen.

```csv
Latein;Deutsch;Formen
caro;das Fleisch;carnis, f.
amīcus;der Freund;amīcī, m.
```

## Technik

Reines HTML/CSS/JavaScript ohne Build-Schritt oder Abhängigkeiten. Die
Sprachausgabe nutzt die [Web Speech API](https://developer.mozilla.org/de/docs/Web/API/Web_Speech_API)
des Browsers.

> Hinweis: Es gibt kaum echte *lateinische* TTS-Stimmen. Italienisch kommt
> der klassischen/kirchlichen Aussprache am nächsten und ist daher
> voreingestellt. Welche Stimmen verfügbar sind, hängt vom Betriebssystem ab.

Weitere Hinweise zu den mobilen Funktionen:

- **Sprachsteuerung** und **Sperrbildschirm-Wiedergabe** nutzen die Web
  Speech Recognition bzw. Media Session API. Verfügbarkeit und Zuverlässigkeit
  hängen vom Browser ab (Chrome/Edge am besten). Bei gesperrtem Bildschirm
  kann die Sprachausgabe je nach Betriebssystem pausieren – die
  Steuertasten bleiben aber sichtbar.
- Die Sprachsteuerung benötigt eine Mikrofon-Freigabe und funktioniert nur
  über `https` (also auch auf GitHub Pages), nicht beim direkten Öffnen der
  lokalen Datei.
