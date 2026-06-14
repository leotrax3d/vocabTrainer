# Audio-Vokabeltrainer

Ein Vokabeltrainer fürs Ohr – speziell für Latein. Jede Vokabel wird
vorgelesen: **erst die lateinische Form, dann eine Pause, dann die deutsche
Übersetzung**. So kannst du mitlernen, ohne auf den Bildschirm schauen zu
müssen (z. B. unterwegs).

Die App ist eine **Client-Server-Anwendung**: Ein Web-Frontend (nginx) spricht
über ein **Node/Express-Backend** mit einer **PostgreSQL-Datenbank**. Alle
Daten – Profil, Vokabeln, Gruppen und der komplette Lernfortschritt – liegen
**serverseitig** in der Datenbank (kein `localStorage` mehr). Gelernt wird nach
einem **6-Phasen-Leitner-System**. Start in einer Zeile:
`docker compose up -d --build`, dann <http://localhost:6767> öffnen
(Details in [`DOCKER.md`](DOCKER.md)).

## Funktionen

Auf dem **Start-Dashboard** wird mit Namen begrüßt; es zeigt Streak, XP, fällige
Vokabeln und die Phasenverteilung. Geübt wird über die Tabs **Hören**,
**Sprechen**, **Schreiben** und **Karten**; **Fortschritt** zeigt die
Auswertung, im Tab **Vokabeln** werden Liste, Gruppen und Einstellungen
verwaltet.

- **6-Phasen-Leitner-System**: Jede Vokabel hat ein eigenes Fälligkeitsdatum
  (`next_review`). Eine **richtige** Antwort hebt sie eine Phase höher und
  verlängert die Pause bis zur nächsten Abfrage
  (Phase 1 → 2 → 3 → 4 → 5 → 6 ≙ **1 / 2 / 4 / 7 / 14 / 30 Tage**), eine
  **falsche** Antwort setzt sie sofort zurück in Phase 1. Beim Üben zieht das
  Backend alle **fälligen** Vokabeln (`next_review <= heute`), **quer über alle
  Phasen gemischt**.
- **Gruppen / Lektionen**: Jede Vokabel ist einer Gruppe (z. B. „Lektion 2",
  „Thema Urlaub") zuordenbar; neue Gruppen lassen sich direkt beim Anlegen
  erstellen, die Liste nach Gruppe filtern.
- **Profil & Gamification**: Kurzes **Onboarding** (Namensabfrage), Begrüßung
  mit Namen, **Streak** (Tage in Folge) und **XP** (Punkte pro gewusster
  Vokabel) mit Level.
- **Hören** bleibt bewusst schlicht: einfach die Vokabeln der Reihe nach
  anhören (Latein → Pause → Deutsch), ganz ohne Abfrage.
- **Fortschritt / Statistik**: Eigener Tab mit **Lern-Serie (Streak)**, **XP**,
  **fälligen Wiederholungen**, der **Phasenverteilung (1–6)** als Balkendiagramm,
  einem **Verlauf der letzten 14 Tage** und einer Liste der **schwierigsten
  Vokabeln**.
- **Favoriten**: Jede Vokabel lässt sich mit einem **Stern** markieren. Die
  Liste kann auf **Favoriten** (oder Offene/Gelernte) gefiltert werden, und in
  allen Modi gibt es **„Nur Favoriten“**, um gezielt schwierige Wörter zu üben.
- **Vibration (mobil)**: Optionales haptisches Feedback bei richtig/falsch
  (über die Vibration-API; in den Einstellungen abschaltbar).
- **Sprechen**: Es wird nur die lateinische Grundform gezeigt; du sprichst die
  deutsche Übersetzung ins Mikrofon (mit Live-Transkript). Stimmt sie, ertönt
  ein Bestätigungston; kannst du sie nicht, wird die Lösung vorgelesen.
- **Schreiben**: Vollständige schriftliche Abfrage – Übersetzung eintippen,
  Enter zum Prüfen. Richtung **Latein → Deutsch** oder **Deutsch → Latein**,
  mit Trefferzähler und Lösung.
- **Karten**: Karteikarten zum Antippen/Umdrehen (mit Wisch-Gesten),
  „Gewusst / Noch üben“, wählbare Startseite (Latein oder Deutsch zuerst).
- Alle Eingaben mit automatischer **Fehlertoleranz** – Tippfehler, fehlende
  Artikel/Umlaute und Zusatzwörter werden verziehen (z. B. „adv adverb“ für
  „Adverb“). Bei mehreren Bedeutungen genügt eine (z. B. „deshalb“ für
  „von dort; darauf; deshalb“), und **Klammer-Zusätze sind optional**
  („der Bürger“ zählt für „der Bürger (Einwohner)“).
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

## Spaced Repetition & Fortschritt

Die Übungsmodi (Sprechen, Schreiben, Karten) planen die Wiederholungen
**serverseitig** nach einem **6-Phasen-Leitner-System**:

- Jede Vokabel hat ein eigenes Fälligkeitsdatum (`next_review`). Eine
  **richtige** Antwort hebt sie eine Phase höher; das nächste Fälligkeitsdatum
  ergibt sich aus der **neuen** Phase: **1 / 2 / 4 / 7 / 14 / 30 Tage**.
- Eine **falsche** Antwort setzt sie sofort zurück in **Phase 1**.
- Der Timer läuft **pro Vokabel**: Steigt Wort A heute in Phase 2 auf, ist es
  in 2 Tagen fällig; steigt Wort B erst morgen auf, ist es erst übermorgen+1
  fällig.
- Beim Start einer Abfrage zieht das Backend **alle fälligen** Vokabeln
  (`next_review <= heute`) – der Tages-Pool ist **komplett gemischt**, quer
  über alle Phasen.

Im Tab **Fortschritt** (und auf dem **Start-Dashboard**) siehst du auf einen
Blick:

- **Lern-Serie (Streak)** – aufeinanderfolgende Tage mit Übung (inkl. Rekord).
- **XP** – Erfahrungspunkte pro gewusster Vokabel (mit Level).
- **Fällig heute** – wie viele Vokabeln zur Wiederholung anstehen.
- **Phasenverteilung (1–6)** – wie viele Vokabeln aktuell in welcher Phase sind,
  als Balkendiagramm.
- **Verlauf der letzten 14 Tage** (richtig/falsch je Tag).
- **Schwierigste Vokabeln** – mit Trefferquote und Stern zum Markieren.

Alle Werte liegen **serverseitig** in der Datenbank und sind damit
geräteübergreifend verfügbar.

## Favoriten

Markiere einzelne Vokabeln über das **Stern**-Symbol als schwierig/wichtig.
In der Vokabelliste kannst du auf **Favoriten** filtern, und in jedem Modus
(Hören, Sprechen, Schreiben, Karten) gibt es **„Nur Favoriten“**, um gezielt
diese Wörter zu üben oder zu hören. Favoriten werden beim **Export** als
`fav: true` mitgespeichert.

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

## Starten (Docker)

Die App benötigt das Backend und die Datenbank – das direkte Öffnen von
`index.html` reicht nicht mehr. Alles läuft per **Docker Compose** (Frontend
per nginx, Node/Express-Backend, PostgreSQL):

```bash
docker compose up -d --build
# dann http://localhost:6767 öffnen
```

Das Web-Dashboard ist nach außen über **Port 6767** erreichbar; das Backend
spricht intern mit der Datenbank, alle Daten liegen in einem **persistenten
Docker-Volume**. Beim ersten Start wird das Schema angelegt und eine
Beispiel-Lektion eingespielt. Alle Details und Befehle stehen in
[`DOCKER.md`](DOCKER.md).

> Hinweis: Eine reine **GitHub-Pages**-Veröffentlichung (statische Dateien)
> genügt für diese Server-Variante nicht mehr, da das Frontend ein erreichbares
> Backend braucht.

## JSON-Format

```json
{
  "group": "Latein · Lektion 1",
  "vocab": [
    { "latin": "caro", "german": "das Fleisch", "forms": "carnis, f.", "fav": false }
  ]
}
```

- `group` – Name der Gruppe/Lektion, der die importierten Vokabeln zugeordnet
  werden (alternativ wird `title` akzeptiert); fehlt beides, landet der Import
  in der Gruppe „Import".
- `latin` – lateinische Grundform (wird zuerst vorgelesen) — Pflicht
- `german` – deutsche Übersetzung (wird nach der Pause vorgelesen) — Pflicht
- `forms` – weitere Formen, optional (nur Anzeige; auf Wunsch mit vorlesbar)
- `fav` – optional `true`, ob die Vokabel als Favorit markiert ist

Ein reines Array (ohne Hülle) wird beim Import ebenfalls akzeptiert. Eine
Beispieldatei liegt als [`beispiel-vokabeln.json`](beispiel-vokabeln.json) bei.

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

**Frontend:** HTML/CSS/JavaScript ohne Build-Schritt. **Backend:** Node.js +
Express. **Datenbank:** PostgreSQL. Ausgeliefert wird per nginx (proxyt `/api`
ans Backend). Die Sprachausgabe nutzt die [Web Speech API](https://developer.mozilla.org/de/docs/Web/API/Web_Speech_API)
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
