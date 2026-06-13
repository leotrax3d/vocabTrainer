# Audio-Vokabeltrainer

Ein Vokabeltrainer fürs Ohr – speziell für Latein. Jede Vokabel wird
vorgelesen: **erst die lateinische Form, dann eine Pause, dann die deutsche
Übersetzung**. So kannst du mitlernen, ohne auf den Bildschirm schauen zu
müssen (z. B. unterwegs).

Die App läuft komplett im Browser. Es gibt keinen Server, keine Anmeldung,
keine Tracking. Deine Vokabeln werden lokal im Browser gespeichert.

## Funktionen

Vier Modi, umschaltbar über die Tabs **Hören**, **Sprechen**, **Schreiben**
und **Karten**.

- **Sprechen**: Es wird nur die lateinische Grundform gezeigt; du sprichst die
  deutsche Übersetzung ins Mikrofon (mit Live-Transkript). Stimmt sie, ertönt
  ein Bestätigungston; kannst du sie nicht, wird die Lösung vorgelesen.
- **Schreiben**: Vollständige schriftliche Abfrage – Übersetzung eintippen,
  Enter zum Prüfen. Richtung **Latein → Deutsch** oder **Deutsch → Latein**,
  mit Trefferzähler und Lösung.
- **Karten**: Karteikarten zum Antippen/Umdrehen (mit Wisch-Gesten),
  „Gewusst / Noch üben“, wählbare Startseite (Latein oder Deutsch zuerst).
- Alle Eingaben mit automatischer **Fehlertoleranz** – Tippfehler, fehlende
  Artikel/Umlaute und Zusatzwörter (z. B. „adv adverb“ für „Adverb“) werden
  trotzdem als richtig gewertet.
- **Audio-Wiedergabe** (Hören) pro Vokabel: Latein → 5 s Pause → Deutsch
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
  „nicht gewusst“ springt weiter ohne Haken, „nochmal“ wiederholt die
  Vokabel, „weiter“ / „zurück“ blättern, „stopp“ / „los“ pausieren bzw.
  starten. Die eigene Sprachausgabe wird ignoriert, damit sie keine Befehle
  auslöst; die Erkennung startet bei Abbrüchen automatisch neu.
- **Einzelne Vokabeln** abspielen, bearbeiten, löschen oder neu hinzufügen.
- **Stimmen wählbar**: für Latein klingt eine *italienische* Stimme am
  natürlichsten, Deutsch separat einstellbar; Sprechtempo regelbar.
- **Komfort**: Zufallsreihenfolge, Endlos-Wiederholung, Formen vorlesen,
  Latein mehrfach wiederholen, Suche.
- **Helles & dunkles Design**, zurückhaltend gestaltet und voll **mobil-tauglich**.
- **Tastatur**: `Leertaste` = Play/Pause, `←` / `→` = blättern.

## Schreiben & Karten

- **Schreiben**: Das Wort wird angezeigt, du tippst die Übersetzung und
  drückst <kbd>Enter</kbd>. Bei richtiger Antwort grünes Feedback und ein
  Ton, sonst kannst du es erneut versuchen oder „Lösung“ (wird vorgelesen).
  Über den Schalter **Deutsch → Latein** lässt sich die Richtung umdrehen.
- **Karten**: Tippen dreht die Karte um, Wischen blättert vor/zurück.
  <kbd>Leertaste</kbd> dreht um, <kbd>←</kbd>/<kbd>→</kbd> blättern,
  <kbd>K</kbd> = gewusst, <kbd>J</kbd> = noch üben. „Gewusst“ hakt die
  Vokabel ab (mit „Gelernte überspringen“ verschwindet sie aus dem Stapel).

## Sprechen-Modus im Detail

Im Tab **Sprechen** erscheint nur das lateinische Wort. Tippe auf das
Mikrofon und sag die deutsche Übersetzung:

- **Live-Transkript**: Während du sprichst, wird das Erkannte in Echtzeit
  angezeigt – du siehst sofort, was verstanden wurde.
- **Richtig** → Bestätigungston, die Lösung wird kurz grün gezeigt, danach
  geht es automatisch weiter (die Vokabel gilt als gelernt).
- **„Lösung“** (oder „weiß nicht“ sagen) → die Übersetzung wird vorgelesen
  und angezeigt.
- **Tippen statt Sprechen**: Über das Eingabefeld lässt sich die Antwort auch
  schreiben – mit derselben Fehlertoleranz. Praktisch ohne Mikrofon.
- **Auto-Mikrofon** hört nach jeder Vokabel automatisch wieder zu (hands-free).
- **Bildschirm anlassen** (Wake Lock) verhindert, dass sich das Display
  abschaltet – du kannst das Gerät weglegen, ohne dass die Sitzung stoppt.
- **Zufall** mischt die Reihenfolge, **Gelernte überspringen** blendet bereits
  abgehakte Vokabeln aus.
- **Tastatur**: <kbd>Leertaste</kbd>/<kbd>Enter</kbd> Mikrofon, <kbd>L</kbd>
  Lösung, <kbd>→</kbd> weiter.

> Hinweis zum „im Hintergrund laufen“: Bei **komplett ausgeschaltetem
> Display** können mobile Browser die **Spracherkennung** aus
> Sicherheitsgründen nicht fortsetzen – das betrifft alle Web-Apps. Die
> Option „Bildschirm anlassen“ hält das Display deshalb wach, damit die
> Abfrage weiterläuft, wenn du das Handy nur weglegst. Reine **Audio-
> Wiedergabe** (Tab „Hören“) läuft über die Media Session dagegen auch bei
> gesperrtem Bildschirm weiter, soweit das Betriebssystem es zulässt.

Die Fehlertoleranz vergleicht nicht stur Zeichen für Zeichen, sondern
normalisiert die Eingabe (Kleinschreibung, Artikel/Füllwörter weg, Umlaute
und „ß“ vereinheitlicht) und erlaubt eine an die Wortlänge angepasste
Tippfehler-Distanz. Mehrere Übersetzungen (durch Komma, Schrägstrich oder
„oder“ getrennt) werden alle akzeptiert; gesprochene Zusatzwörter schaden
nicht, solange das richtige Wort dabei ist.

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
