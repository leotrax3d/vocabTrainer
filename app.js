/* ============================================================
   Vokabeltrainer – Logik
   Reine Browser-App (Web Speech API + Web Audio + localStorage).
   ============================================================ */
(() => {
  "use strict";

  const synth = window.speechSynthesis;
  const STORE_KEY = "vokabeltrainer.state.v1";

  /* ---------- Icons (SVG, currentColor) ---------- */
  const ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 5.5v13a1 1 0 0 1-1.6.8l-8.7-6.5a1 1 0 0 1 0-1.6l8.7-6.5A1 1 0 0 1 20 5.5z"/><rect x="5" y="5" width="2.4" height="14" rx="1"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 5.5v13a1 1 0 0 0 1.6.8l8.7-6.5a1 1 0 0 0 0-1.6L5.6 4.7A1 1 0 0 0 4 5.5z"/><rect x="16.6" y="5" width="2.4" height="14" rx="1"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    playSm: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z"/><path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V21H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-3.08A7 7 0 0 0 19 11z"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 5 6.5 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3.5l4.5 4a1 1 0 0 0 1.7-.75V5.75A1 1 0 0 0 11 5z"/><path d="M16 8.8a4 4 0 0 1 0 6.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };

  /* ---------- State ---------- */
  const state = {
    vocab: [],          // [{ id, seq, latin, german, forms, done }]
    title: "Latein",
    settings: {
      pauseBetween: 5,   // s zwischen Latein und Deutsch
      pauseForms: 1,     // s vor den Formen (wenn vorgelesen)
      pauseAfter: 1.5,   // s nach jeder Vokabel
      rate: 0.9,
      repeatLatin: 1,
      latinVoiceURI: "",
      germanVoiceURI: "",
      shuffle: false,
      loop: false,
      readForms: false,
      beep: false,
      skipDone: true,
      sort: "seq",
      qShuffle: false,
      qAuto: true,
      qWake: true,
      qSkipDone: false,
      wDir: false,        // Schreiben: false = Latein→Deutsch, true = Deutsch→Latein
      wShuffle: false,
      wSkipDone: false,
      cDir: false,        // Karten: false = Latein zuerst, true = Deutsch zuerst
      cShuffle: false,
      cSkipDone: false,
      theme: "light",
    },
  };

  // Abfrage-Modus (unabhängig vom Hören-Modus)
  const quiz = { order: [], pos: -1, currentId: null, listening: false, revealed: false,
                 correctCount: 0, completedCount: 0, finished: false, justAnswered: false, typing: false };
  let quizReco = null;
  let quizArmed = false;   // Mikrofon mind. einmal gestartet (Berechtigung erteilt)
  let currentView = "listen";
  let wakeLock = null;     // Screen Wake Lock (Bildschirm anlassen)

  // Schreiben-Modus
  const write = { order: [], pos: -1, answered: false, correctCount: 0, completedCount: 0, finished: false };
  // Karten-Modus
  const cards = { order: [], pos: -1, flipped: false };
  let cardSwiped = false, cardTouchX = 0, cardTouchY = 0;

  const player = { playing: false, order: [], pos: -1, currentId: null, cancel: false, timer: null };

  let voices = [];
  let editingId = null;
  let seqCounter = 0;
  let audioCtx = null;
  let silentAudio = null;     // hält die Media Session aktiv (Sperrbildschirm)
  let recognition = null;     // Sprachsteuerung
  let recognitionOn = false;
  let lastCmd = { name: "", t: 0 };
  let speakingNow = false;    // App spricht gerade (Mikrofon ignorieren)
  let muteRecoUntil = 0;      // kurze Nachlaufzeit nach dem Sprechen
  let restartTimer = null;

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    deckTitle: $("deckTitle"),
    npWrap: $("nowPlaying"), npLabel: $("npLabel"),
    npLatin: $("npLatin"), npGerman: $("npGerman"), npForms: $("npForms"),
    progressBar: $("progressBar"), progressText: $("progressText"),
    prevBtn: $("prevBtn"), playBtn: $("playBtn"), nextBtn: $("nextBtn"),
    shuffleToggle: $("shuffleToggle"), loopToggle: $("loopToggle"),
    readFormsToggle: $("readFormsToggle"), beepToggle: $("beepToggle"), skipDoneToggle: $("skipDoneToggle"),
    voiceToggle: $("voiceToggle"), voiceChip: $("voiceChip"), shareBtn: $("shareBtn"),
    pauseBetween: $("pauseBetween"), pauseBetweenVal: $("pauseBetweenVal"),
    pauseForms: $("pauseForms"), pauseFormsVal: $("pauseFormsVal"),
    pauseAfter: $("pauseAfter"), pauseAfterVal: $("pauseAfterVal"),
    rate: $("rate"), rateVal: $("rateVal"),
    repeatLatin: $("repeatLatin"), repeatLatinVal: $("repeatLatinVal"),
    latinVoice: $("latinVoice"), germanVoice: $("germanVoice"),
    list: $("vocabList"), emptyState: $("emptyState"), countPill: $("countPill"),
    search: $("searchInput"), sortSelect: $("sortSelect"),
    addBtn: $("addBtn"), checkAllBtn: $("checkAllBtn"), uncheckAllBtn: $("uncheckAllBtn"),
    importBtn: $("importBtn"), exportBtn: $("exportBtn"), sampleBtn: $("sampleBtn"),
    fileInput: $("fileInput"), emptySample: $("emptySample"),
    themeToggle: $("themeToggle"), themeIcon: document.querySelector(".theme-icon"),
    dialog: $("editDialog"), editForm: $("editForm"), editTitle: $("editTitle"),
    fLatin: $("fLatin"), fGerman: $("fGerman"), fForms: $("fForms"), cancelEdit: $("cancelEdit"),
    toast: $("toast"),
    // Tabs & Quiz
    tabListen: $("tabListen"), tabQuiz: $("tabQuiz"),
    viewListen: $("view-listen"), viewQuiz: $("view-quiz"),
    qProgress: $("qProgress"), qHint: $("qHint"), qLatin: $("qLatin"), qHearLatin: $("qHearLatin"),
    qStatus: $("qStatus"), qTranscript: $("qTranscript"), qAnswer: $("qAnswer"),
    qSolveBtn: $("qSolveBtn"), qMicBtn: $("qMicBtn"), qNextBtn: $("qNextBtn"),
    qTypeForm: $("qTypeForm"), qTypeInput: $("qTypeInput"),
    qShuffleToggle: $("qShuffleToggle"), qAutoToggle: $("qAutoToggle"),
    qWakeToggle: $("qWakeToggle"), qSkipDoneToggle: $("qSkipDoneToggle"),
    qScore: $("qScore"), qEmptyState: $("qEmptyState"),
    // Schreiben
    wProgress: $("wProgress"), wHint: $("wHint"), wPrompt: $("wPrompt"), wHear: $("wHear"),
    wForm: $("wForm"), wInput: $("wInput"), wCheckBtn: $("wCheckBtn"),
    wStatus: $("wStatus"), wAnswer: $("wAnswer"), wSolveBtn: $("wSolveBtn"), wNextBtn: $("wNextBtn"),
    wDirToggle: $("wDirToggle"), wShuffleToggle: $("wShuffleToggle"), wSkipDoneToggle: $("wSkipDoneToggle"),
    wScore: $("wScore"), wEmptyState: $("wEmptyState"),
    // Karten
    cProgress: $("cProgress"), flashcard: $("flashcard"), flashInner: $("flashInner"),
    cFrontLabel: $("cFrontLabel"), cFront: $("cFront"), cHearFront: $("cHearFront"),
    cBackLabel: $("cBackLabel"), cBack: $("cBack"), cForms: $("cForms"),
    cPrevBtn: $("cPrevBtn"), cUnknownBtn: $("cUnknownBtn"), cKnownBtn: $("cKnownBtn"), cNextBtn: $("cNextBtn"),
    cDirToggle: $("cDirToggle"), cShuffleToggle: $("cShuffleToggle"), cSkipDoneToggle: $("cSkipDoneToggle"),
    cScore: $("cScore"), cEmptyState: $("cEmptyState"),
  };

  /* ---------- Beispiel-Daten ---------- */
  const SAMPLE = {
    title: "Latein · Lektion 1",
    vocab: [
      { latin: "caro", german: "das Fleisch", forms: "carnis, f." },
      { latin: "amīcus", german: "der Freund", forms: "amīcī, m." },
      { latin: "puella", german: "das Mädchen", forms: "puellae, f." },
      { latin: "bellum", german: "der Krieg", forms: "bellī, n." },
      { latin: "videre", german: "sehen", forms: "videō, vīdī, vīsum" },
      { latin: "dīcere", german: "sagen, sprechen", forms: "dīcō, dīxī, dictum" },
      { latin: "magnus", german: "groß", forms: "magna, magnum" },
      { latin: "tempus", german: "die Zeit", forms: "temporis, n." },
    ],
  };

  /* ---------- Utilities ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmt = (n) => n.toLocaleString("de-DE", { minimumFractionDigits: n % 1 ? 1 : 0 });

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.toast.hidden = true; }, 2600);
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ vocab: state.vocab, title: state.title, settings: state.settings }));
    } catch (e) { /* Speicher evtl. voll/blockiert */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (Array.isArray(data.vocab)) state.vocab = data.vocab.map(normalize);
      if (typeof data.title === "string") state.title = data.title;
      if (data.settings) Object.assign(state.settings, data.settings);
      return true;
    } catch (e) { return false; }
  }

  function normalize(v) {
    return {
      id: v.id || uid(),
      seq: Number.isFinite(v.seq) ? v.seq : seqCounter++,
      latin: String(v.latin ?? "").trim(),
      german: String(v.german ?? "").trim(),
      forms: String(v.forms ?? "").trim(),
      done: !!v.done,
    };
  }

  /* ---------- Voices ---------- */
  function loadVoices() {
    voices = synth ? synth.getVoices() : [];
    if (!voices.length) return;
    fillVoiceSelect(el.latinVoice, ["it", "la"], state.settings.latinVoiceURI);
    fillVoiceSelect(el.germanVoice, ["de"], state.settings.germanVoiceURI);
  }

  function fillVoiceSelect(select, preferLangs, savedURI) {
    select.innerHTML = "";
    const sorted = [...voices].sort((a, b) => {
      const ai = preferLangs.findIndex((l) => a.lang.toLowerCase().startsWith(l));
      const bi = preferLangs.findIndex((l) => b.lang.toLowerCase().startsWith(l));
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    for (const v of sorted) {
      const opt = document.createElement("option");
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      select.appendChild(opt);
    }
    if (savedURI && sorted.some((v) => v.voiceURI === savedURI)) {
      select.value = savedURI;
    } else {
      const pref = sorted.find((v) => preferLangs.some((l) => v.lang.toLowerCase().startsWith(l)));
      if (pref) select.value = pref.voiceURI;
    }
  }

  const voiceByURI = (uri) => voices.find((v) => v.voiceURI === uri);

  /* ---------- Sprechen & Ton ---------- */
  function speak(text, voiceURI, fallbackLang) {
    return new Promise((resolve) => {
      if (!text || !synth) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      const v = voiceByURI(voiceURI);
      if (v) { u.voice = v; u.lang = v.lang; }
      else if (fallbackLang) { u.lang = fallbackLang; }
      u.rate = state.settings.rate;
      speakingNow = true;
      const done = () => { speakingNow = false; muteRecoUntil = Date.now() + 500; resolve(); };
      u.onend = done;
      u.onerror = done;
      synth.speak(u);
    });
  }

  function beep() {
    return new Promise((resolve) => {
      if (!state.settings.beep) return resolve();
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const dur = 0.16;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const t = audioCtx.currentTime;
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + dur);
        osc.onended = resolve;
        setTimeout(resolve, dur * 1000 + 60);
      } catch (e) { resolve(); }
    });
  }

  function wait(seconds) {
    return new Promise((resolve) => {
      if (seconds <= 0) return resolve();
      player.timer = setTimeout(resolve, seconds * 1000);
    });
  }

  /* ---------- Media Session (Sperrbildschirm / Hintergrund) ---------- */
  function writeStr(view, off, str) { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); }

  function makeSilentWavUrl(seconds = 2) {
    const rate = 8000, n = rate * seconds;
    const view = new DataView(new ArrayBuffer(44 + n * 2));
    writeStr(view, 0, "RIFF"); view.setUint32(4, 36 + n * 2, true); writeStr(view, 8, "WAVE");
    writeStr(view, 12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    writeStr(view, 36, "data"); view.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([view], { type: "audio/wav" }));
  }

  function setupMediaSession() {
    if (!("mediaSession" in navigator)) return;
    silentAudio = new Audio(makeSilentWavUrl());
    silentAudio.loop = true;
    silentAudio.volume = 0;
    const ms = navigator.mediaSession;
    try {
      ms.setActionHandler("play", () => play());
      ms.setActionHandler("pause", () => pause());
      ms.setActionHandler("stop", () => stop());
      ms.setActionHandler("previoustrack", () => jump(-1));
      ms.setActionHandler("nexttrack", () => jump(1));
    } catch (e) { /* nicht alle Aktionen überall unterstützt */ }
  }

  function updateMediaMetadata(v) {
    if (!("mediaSession" in navigator) || !v) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: v.latin,
        artist: v.german,
        album: state.title,
      });
    } catch (e) { /* ignore */ }
  }

  function mediaPlaybackState(s) {
    if ("mediaSession" in navigator) { try { navigator.mediaSession.playbackState = s; } catch (e) {} }
    if (!silentAudio) return;
    if (s === "playing") silentAudio.play().catch(() => {});
    else silentAudio.pause();
  }

  /* ---------- Wake Lock (Bildschirm anlassen) ---------- */
  async function updateWakeLock() {
    const want = state.settings.qWake && ("wakeLock" in navigator) &&
                 (player.playing || currentView === "quiz");
    try {
      if (want && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      } else if (!want && wakeLock) {
        const wl = wakeLock; wakeLock = null; await wl.release();
      }
    } catch (e) { /* nicht unterstützt oder nicht erlaubt */ }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") updateWakeLock();
  });

  /* ---------- Sprachsteuerung ---------- */
  const CMD_LABEL = {
    known: "Erkannt: abgehakt – weiter",
    next: "Erkannt: weiter",
    prev: "Erkannt: zurück",
    pause: "Erkannt: Pause",
    play: "Erkannt: Wiedergabe",
    repeat: "Erkannt: nochmal",
  };

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("Spracherkennung wird in diesem Browser nicht unterstützt."); el.voiceToggle.checked = false; return; }
    const secure = window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!secure) toast("Hinweis: Mikrofon braucht HTTPS – online (z. B. GitHub Pages) statt lokaler Datei.");

    if (!recognition) {
      recognition = new SR();
      recognition.lang = "de-DE";
      recognition.continuous = true;
      recognition.interimResults = true;   // schnellere Reaktion
      recognition.maxAlternatives = 3;     // mehr Treffer-Chancen
      recognition.onresult = handleVoiceResult;
      recognition.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          toast("Mikrofon-Zugriff verweigert.");
          stopVoice();
        }
        // no-speech / aborted / network: onend übernimmt den Neustart
      };
      recognition.onend = scheduleRestart;
    }
    recognitionOn = true;
    el.voiceToggle.checked = true;
    el.voiceChip.classList.add("listening");
    try { recognition.start(); } catch (e) {}
    toast("Sprachsteuerung aktiv – sag z. B. „gewusst“ oder „weiter“.");
  }

  function scheduleRestart() {
    if (!recognitionOn) return;
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      if (!recognitionOn) return;
      try { recognition.start(); }
      catch (e) { restartTimer = setTimeout(() => { try { recognition.start(); } catch (_) {} }, 400); }
    }, 250);
  }

  function stopVoice() {
    recognitionOn = false;
    clearTimeout(restartTimer);
    el.voiceToggle.checked = false;
    el.voiceChip.classList.remove("listening");
    if (recognition) { recognition.onend = null; try { recognition.stop(); } catch (e) {} recognition.onend = scheduleRestart; }
  }

  function handleVoiceResult(e) {
    // Eigene Sprachausgabe nicht als Befehl werten
    if (speakingNow || Date.now() < muteRecoUntil) return;
    // Alle Alternativen des letzten (auch vorläufigen) Ergebnisses prüfen
    const res = e.results[e.results.length - 1];
    if (!res) return;
    for (let i = 0; i < res.length; i++) {
      const text = (res[i].transcript || "").toLowerCase().trim();
      if (text && matchCommand(text)) return; // erster Treffer reicht
    }
  }

  function matchCommand(text) {
    let cmd = null;
    // Verneinung zuerst – „nicht gewusst“ darf nicht als „gewusst“ gelten
    if (/(nicht gewusst|nicht gewußt|nicht gekonnt|weiß nicht|weiss nicht|keine ahnung|falsch|leider|nein)/.test(text)) cmd = "next";
    else if (/(gewusst|gewußt|gekonnt|richtig|konnte|kann ich|kenne ich|abhaken|gelernt|sitzt)/.test(text)) cmd = "known";
    else if (/(nochmal|noch mal|wiederhol|wiederholen|repeat)/.test(text)) cmd = "repeat";
    else if (/(zurück|zurueck|vorher|davor|zurueckgehen)/.test(text)) cmd = "prev";
    else if (/(weiterspielen|abspielen|starten|start|fortsetzen|loslegen|los geht|^los\b|play)/.test(text)) cmd = "play";
    else if (/(stop|stopp|pause|anhalten|\bhalt\b|warte)/.test(text)) cmd = "pause";
    else if (/(weiter|nächste|naechste|nächstes|naechstes|überspringen|ueberspringen|skip|next)/.test(text)) cmd = "next";
    if (!cmd) return false;

    const now = Date.now();
    if (cmd === lastCmd.name && now - lastCmd.t < 1500) return true; // Doppel-Trigger schlucken
    lastCmd = { name: cmd, t: now };

    if (cmd === "known") markCurrentKnown();
    else if (cmd === "next") jump(1);
    else if (cmd === "prev") jump(-1);
    else if (cmd === "pause") pause();
    else if (cmd === "play") play();
    else if (cmd === "repeat") repeatCurrent();
    toast(CMD_LABEL[cmd]);
    return true;
  }

  function markCurrentKnown() {
    const v = state.vocab.find((x) => x.id === player.currentId);
    if (v) { v.done = true; save(); renderList(); }
    jump(1);
  }

  function repeatCurrent() {
    if (player.currentId) playOne(player.currentId);
    else play();
  }

  /* ---------- Teilen per Link ---------- */
  const b64encode = (str) => btoa(unescape(encodeURIComponent(str)));
  const b64decode = (b64) => decodeURIComponent(escape(atob(b64)));

  function shareDeck() {
    if (!state.vocab.length) { toast("Keine Vokabeln zum Teilen."); return; }
    const compact = { t: state.title, v: state.vocab.map((x) => [x.latin, x.german, x.forms || ""]) };
    const url = location.origin + location.pathname + "#deck=" + b64encode(JSON.stringify(compact));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => toast("Link in die Zwischenablage kopiert."),
        () => window.prompt("Link kopieren:", url)
      );
    } else {
      window.prompt("Link kopieren:", url);
    }
  }

  function checkSharedDeck() {
    const m = location.hash.match(/deck=([^&]+)/);
    if (!m) return;
    try {
      const data = JSON.parse(b64decode(decodeURIComponent(m[1])));
      const arr = (data.v || []).map(([latin, german, forms]) => ({ latin, german, forms }));
      if (arr.length) {
        const ok = state.vocab.length ? window.confirm("Geteilte Vokabelliste laden? Deine aktuelle Liste wird ersetzt.") : true;
        if (ok) {
          state.title = data.t || "Geteilte Liste";
          seqCounter = 0;
          state.vocab = arr.map((v, i) => normalize({ ...v, seq: i })).filter((v) => v.latin && v.german);
          seqCounter = state.vocab.length;
          applyDeckTitle(); save();
          toast(`${state.vocab.length} Vokabeln aus Link geladen.`);
        }
      }
    } catch (e) { /* ungültiger Link */ }
    history.replaceState(null, "", location.pathname + location.search);
  }

  /* ---------- Abspiel-Reihenfolge ---------- */
  function buildOrder() {
    let idx = state.vocab.map((_, i) => i);
    if (state.settings.skipDone) idx = idx.filter((i) => !state.vocab[i].done);
    if (state.settings.shuffle) {
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
    }
    player.order = idx;
  }

  /* ---------- Wiedergabe-Schleife ---------- */
  async function playLoop() {
    player.playing = true;
    player.cancel = false;
    updatePlayButton();

    while (player.playing && !player.cancel) {
      if (player.pos < 0 || player.pos >= player.order.length) {
        buildOrder();
        if (!player.order.length) { stop(); toast("Keine offenen Vokabeln zum Abspielen."); return; }
        player.pos = 0;
      }

      const v = state.vocab[player.order[player.pos]];
      if (!v) { player.pos++; continue; }

      player.currentId = v.id;
      renderNowPlaying(v);
      updateMediaMetadata(v);
      renderList();
      updateProgress();

      // Signalton zum Vokabelbeginn
      await beep();
      if (player.cancel) break;

      // 1) Latein (ggf. mehrfach)
      setNpState("speaking-latin", "Latein");
      for (let r = 0; r < state.settings.repeatLatin && !player.cancel; r++) {
        await speak(v.latin, state.settings.latinVoiceURI, "it-IT");
        if (r < state.settings.repeatLatin - 1) await wait(0.6);
      }
      if (player.cancel) break;

      // 2) Optional: weitere Formen als eigener Teil
      if (state.settings.readForms && v.forms) {
        await wait(state.settings.pauseForms);
        if (player.cancel) break;
        setNpState("speaking-forms", "Formen");
        await speak(v.forms, state.settings.latinVoiceURI, "it-IT");
        if (player.cancel) break;
      }

      // 3) Pause Latein → Deutsch
      setNpState("", "Pause");
      await wait(state.settings.pauseBetween);
      if (player.cancel) break;

      // 4) Deutsch
      setNpState("speaking-german", "Deutsch");
      await speak(v.german, state.settings.germanVoiceURI, "de-DE");
      if (player.cancel) break;

      // 5) Pause nach Vokabel
      setNpState("", "");
      await wait(state.settings.pauseAfter);
      if (player.cancel) break;

      player.pos++;
      if (player.pos >= player.order.length) {
        if (state.settings.loop) { player.pos = -1; }
        else { stop(); toast("Durchlauf abgeschlossen."); return; }
      }
    }
  }

  function setNpState(cls, label) {
    el.npWrap.classList.remove("speaking-latin", "speaking-forms", "speaking-german");
    if (cls) el.npWrap.classList.add(cls);
    if (label !== undefined) el.npLabel.textContent = label;
  }

  /* ---------- Steuerung ---------- */
  function play() {
    if (!state.vocab.length) { toast("Bitte zuerst Vokabeln hinzufügen."); return; }
    if (player.playing) return;
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    if (player.pos < 0) buildOrder();
    mediaPlaybackState("playing");
    updateWakeLock();
    playLoop();
  }

  function pause() {
    player.playing = false;
    player.cancel = true;
    if (synth) synth.cancel();
    clearTimeout(player.timer);
    mediaPlaybackState("paused");
    updateWakeLock();
    setNpState("", "Pausiert");
    updatePlayButton();
  }

  function stop() {
    player.playing = false;
    player.cancel = true;
    player.pos = -1;
    player.currentId = null;
    if (synth) synth.cancel();
    clearTimeout(player.timer);
    mediaPlaybackState("paused");
    updateWakeLock();
    setNpState("", "Bereit");
    updatePlayButton();
    renderList();
    updateProgress();
  }

  function togglePlay() { player.playing ? pause() : play(); }

  function jump(delta) {
    const wasPlaying = player.playing;
    player.cancel = true;
    if (synth) synth.cancel();
    clearTimeout(player.timer);
    if (!player.order.length) buildOrder();
    if (!player.order.length) return;
    if (player.pos < 0) player.pos = 0;
    player.pos = (player.pos + delta + player.order.length) % player.order.length;
    if (wasPlaying) {
      player.playing = false;
      setTimeout(() => play(), 60);
    } else {
      const v = state.vocab[player.order[player.pos]];
      player.currentId = v.id;
      renderNowPlaying(v);
      updateMediaMetadata(v);
      renderList();
      updateProgress();
    }
  }

  function playOne(id) {
    const idx = state.vocab.findIndex((v) => v.id === id);
    if (idx < 0) return;
    pause();
    player.order = [idx];
    player.pos = 0;
    setTimeout(() => play(), 60);
  }

  function updatePlayButton() {
    el.playBtn.innerHTML = player.playing ? ICON.pause : ICON.play;
    el.playBtn.setAttribute("aria-label", player.playing ? "Pause" : "Abspielen");
  }

  /* ---------- Rendering ---------- */
  function renderNowPlaying(v) {
    el.npLatin.textContent = v ? v.latin : "—";
    el.npGerman.textContent = v ? v.german : "";
    el.npForms.textContent = v && v.forms ? v.forms : "";
  }

  function updateProgress() {
    const total = player.order.length || activeCount();
    const cur = player.pos >= 0 ? player.pos + 1 : 0;
    el.progressText.textContent = `${cur} von ${total}`;
    el.progressBar.style.width = total ? `${(cur / total) * 100}%` : "0%";
  }

  const activeCount = () => state.vocab.filter((v) => !v.done).length;

  function sortVocab() {
    const mode = state.settings.sort;
    const coll = new Intl.Collator("de", { sensitivity: "base" });
    state.vocab.sort((a, b) => {
      if (mode === "latin") return coll.compare(a.latin, b.latin);
      if (mode === "german") return coll.compare(a.german, b.german);
      if (mode === "status") return (a.done - b.done) || (a.seq - b.seq);
      return a.seq - b.seq; // "seq" = Reihenfolge
    });
  }

  function renderList() {
    sortVocab();
    const q = el.search.value.trim().toLowerCase();
    el.list.innerHTML = "";
    const filtered = state.vocab.filter((v) =>
      !q || v.latin.toLowerCase().includes(q) || v.german.toLowerCase().includes(q) || v.forms.toLowerCase().includes(q)
    );

    el.emptyState.hidden = state.vocab.length !== 0;
    el.countPill.textContent = `${activeCount()} / ${state.vocab.length}`;

    for (const v of filtered) {
      const li = document.createElement("li");
      li.className = "vocab-item" + (v.done ? " is-done" : "") + (v.id === player.currentId ? " is-current" : "");

      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.className = "vi-check"; cb.checked = v.done;
      cb.setAttribute("aria-label", `„${v.latin}“ als gelernt markieren`);
      cb.addEventListener("change", () => { v.done = cb.checked; save(); renderList(); updateProgress(); });

      const text = document.createElement("div");
      text.className = "vi-text";
      text.innerHTML =
        `<div class="vi-latin"></div><div class="vi-german"></div>` +
        (v.forms ? `<div class="vi-forms"></div>` : "");
      text.querySelector(".vi-latin").textContent = v.latin;
      text.querySelector(".vi-german").textContent = v.german;
      if (v.forms) text.querySelector(".vi-forms").textContent = v.forms;

      const actions = document.createElement("div");
      actions.className = "vi-actions";
      const playBtn = mkBtn(ICON.playSm, "Diese Vokabel abspielen", () => playOne(v.id));
      playBtn.classList.add("play-one");
      const editBtn = mkBtn(ICON.edit, "Bearbeiten", () => openEdit(v.id));
      const delBtn = mkBtn(ICON.trash, "Löschen", () => removeVocab(v.id));
      actions.append(playBtn, editBtn, delBtn);

      li.append(cb, text, actions);
      el.list.appendChild(li);
    }
  }

  function mkBtn(html, title, onClick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "vi-btn"; b.innerHTML = html;
    b.title = title; b.setAttribute("aria-label", title);
    b.addEventListener("click", onClick);
    return b;
  }

  /* ---------- CRUD ---------- */
  function openEdit(id) {
    editingId = id || null;
    const v = id ? state.vocab.find((x) => x.id === id) : null;
    el.editTitle.textContent = v ? "Vokabel bearbeiten" : "Vokabel hinzufügen";
    el.fLatin.value = v ? v.latin : "";
    el.fGerman.value = v ? v.german : "";
    el.fForms.value = v ? v.forms : "";
    el.dialog.showModal();
    el.fLatin.focus();
  }

  function submitEdit(e) {
    e.preventDefault();
    const data = { latin: el.fLatin.value.trim(), german: el.fGerman.value.trim(), forms: el.fForms.value.trim() };
    if (!data.latin || !data.german) return;
    if (editingId) {
      const v = state.vocab.find((x) => x.id === editingId);
      if (v) Object.assign(v, data);
    } else {
      state.vocab.push(normalize(data));
    }
    el.dialog.close();
    save(); renderList(); updateProgress();
  }

  function removeVocab(id) {
    state.vocab = state.vocab.filter((v) => v.id !== id);
    save(); renderList(); updateProgress();
  }

  /* ---------- Import / Export ---------- */
  function exportJSON() {
    const payload = {
      title: state.title,
      vocab: state.vocab.map(({ latin, german, forms, done }) => ({ latin, german, forms, done })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vokabeln-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Exportiert.");
  }

  function splitCsvLine(line, delim) {
    const out = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') { q = true; }
      else if (ch === delim) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];
    const first = lines[0];
    const counts = { "\t": (first.match(/\t/g) || []).length, ";": (first.match(/;/g) || []).length, ",": (first.match(/,/g) || []).length };
    const delim = Object.keys(counts).reduce((a, b) => (counts[b] > counts[a] ? b : a), ",");
    let rows = lines.map((l) => splitCsvLine(l, delim));
    const head = rows[0].map((c) => c.toLowerCase().trim());
    if (head.some((c) => /(lat|deutsch|german|übersetz|ubersetz|wort|begriff)/.test(c))) rows = rows.slice(1);
    return rows
      .map((c) => ({ latin: (c[0] || "").trim(), german: (c[1] || "").trim(), forms: (c[2] || "").trim() }))
      .filter((v) => v.latin && v.german);
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const isCsv = /\.csv$/i.test(file.name) || !/^\s*[\[{]/.test(text);
      try {
        let arr, title;
        if (isCsv) {
          arr = parseCSV(text);
          if (!arr.length) throw new Error("Keine Zeilen erkannt.");
        } else {
          const data = JSON.parse(text);
          arr = Array.isArray(data) ? data : data.vocab;
          if (!Array.isArray(arr)) throw new Error("Kein Vokabel-Array gefunden.");
          title = data.title;
        }
        if (title) state.title = title;
        seqCounter = 0;
        state.vocab = arr.map((v, i) => normalize({ ...v, seq: i })).filter((v) => v.latin && v.german);
        seqCounter = state.vocab.length;
        applyDeckTitle();
        save(); renderList(); updateProgress();
        toast(`${state.vocab.length} Vokabeln importiert.`);
      } catch (err) {
        toast("Import fehlgeschlagen: Datei nicht lesbar.");
      }
    };
    reader.readAsText(file);
  }

  function loadSample() {
    state.title = SAMPLE.title;
    seqCounter = 0;
    state.vocab = SAMPLE.vocab.map((v, i) => normalize({ ...v, seq: i }));
    seqCounter = state.vocab.length;
    applyDeckTitle();
    save(); renderList(); updateProgress();
    toast("Beispiel geladen.");
  }

  function applyDeckTitle() { if (el.deckTitle) el.deckTitle.textContent = state.title; }

  /* ---------- Settings UI ---------- */
  function applySettingsToUI() {
    const s = state.settings;
    el.pauseBetween.value = s.pauseBetween; el.pauseBetweenVal.textContent = fmt(s.pauseBetween);
    el.pauseForms.value = s.pauseForms; el.pauseFormsVal.textContent = fmt(s.pauseForms);
    el.pauseAfter.value = s.pauseAfter; el.pauseAfterVal.textContent = fmt(s.pauseAfter);
    el.rate.value = s.rate; el.rateVal.textContent = fmt(s.rate);
    el.repeatLatin.value = s.repeatLatin; el.repeatLatinVal.textContent = s.repeatLatin;
    el.shuffleToggle.checked = s.shuffle;
    el.loopToggle.checked = s.loop;
    el.readFormsToggle.checked = s.readForms;
    el.beepToggle.checked = s.beep;
    el.skipDoneToggle.checked = s.skipDone;
    el.sortSelect.value = s.sort;
    el.qShuffleToggle.checked = s.qShuffle;
    el.qAutoToggle.checked = s.qAuto;
    el.qWakeToggle.checked = s.qWake;
    el.qSkipDoneToggle.checked = s.qSkipDone;
    el.wDirToggle.checked = s.wDir;
    el.wShuffleToggle.checked = s.wShuffle;
    el.wSkipDoneToggle.checked = s.wSkipDone;
    el.cDirToggle.checked = s.cDir;
    el.cShuffleToggle.checked = s.cShuffle;
    el.cSkipDoneToggle.checked = s.cSkipDone;
    applyTheme(s.theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    el.themeIcon.innerHTML = theme === "dark" ? ICON.sun : ICON.moon;
    state.settings.theme = theme;
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    el.prevBtn.innerHTML = ICON.prev;
    el.nextBtn.innerHTML = ICON.next;
    el.qMicBtn.innerHTML = ICON.mic;
    el.qHearLatin.innerHTML = ICON.speaker;
    el.wHear.innerHTML = ICON.speaker;
    el.cHearFront.innerHTML = ICON.speaker;
    el.cPrevBtn.innerHTML = ICON.prev;
    el.cNextBtn.innerHTML = ICON.next;

    el.playBtn.addEventListener("click", togglePlay);
    el.prevBtn.addEventListener("click", () => jump(-1));
    el.nextBtn.addEventListener("click", () => jump(1));

    const toggle = (chk, key, opts = {}) => chk.addEventListener("change", () => {
      state.settings[key] = chk.checked; save();
      if (opts.rebuild && player.pos < 0) buildOrder();
      if (opts.rebuild) updateProgress();
    });
    toggle(el.shuffleToggle, "shuffle", { rebuild: true });
    toggle(el.loopToggle, "loop");
    toggle(el.readFormsToggle, "readForms");
    toggle(el.beepToggle, "beep");
    toggle(el.skipDoneToggle, "skipDone", { rebuild: true });

    const slider = (input, valEl, key, isInt) => input.addEventListener("input", () => {
      const val = isInt ? parseInt(input.value, 10) : parseFloat(input.value);
      state.settings[key] = val;
      valEl.textContent = isInt ? val : fmt(val);
      save();
    });
    slider(el.pauseBetween, el.pauseBetweenVal, "pauseBetween");
    slider(el.pauseForms, el.pauseFormsVal, "pauseForms");
    slider(el.pauseAfter, el.pauseAfterVal, "pauseAfter");
    slider(el.rate, el.rateVal, "rate");
    slider(el.repeatLatin, el.repeatLatinVal, "repeatLatin", true);

    el.latinVoice.addEventListener("change", () => { state.settings.latinVoiceURI = el.latinVoice.value; save(); });
    el.germanVoice.addEventListener("change", () => { state.settings.germanVoiceURI = el.germanVoice.value; save(); });

    el.sortSelect.addEventListener("change", () => { state.settings.sort = el.sortSelect.value; save(); renderList(); });
    el.search.addEventListener("input", renderList);

    el.addBtn.addEventListener("click", () => openEdit(null));
    el.checkAllBtn.addEventListener("click", () => { state.vocab.forEach((v) => v.done = true); save(); renderList(); updateProgress(); });
    el.uncheckAllBtn.addEventListener("click", () => { state.vocab.forEach((v) => v.done = false); save(); renderList(); updateProgress(); });

    el.exportBtn.addEventListener("click", exportJSON);
    el.importBtn.addEventListener("click", () => el.fileInput.click());
    el.fileInput.addEventListener("change", () => { if (el.fileInput.files[0]) importFile(el.fileInput.files[0]); el.fileInput.value = ""; });
    el.shareBtn.addEventListener("click", shareDeck);
    el.sampleBtn.addEventListener("click", loadSample);
    el.emptySample.addEventListener("click", loadSample);

    el.voiceToggle.addEventListener("change", () => { el.voiceToggle.checked ? startVoice() : stopVoice(); });

    el.editForm.addEventListener("submit", submitEdit);
    el.cancelEdit.addEventListener("click", () => el.dialog.close());

    el.themeToggle.addEventListener("click", () => { applyTheme(state.settings.theme === "dark" ? "light" : "dark"); save(); });

    document.addEventListener("keydown", (e) => {
      if (el.dialog.open) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (currentView === "quiz") {
        if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); quiz.listening ? quizStopListen() : quizListen(); }
        else if (e.code === "ArrowRight") { e.preventDefault(); quizNext(true); }
        else if (e.key && e.key.toLowerCase() === "l") { e.preventDefault(); quizReveal(); }
        return;
      }
      if (currentView === "cards") {
        if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); flipCard(); }
        else if (e.code === "ArrowLeft") { e.preventDefault(); cardsPrev(); }
        else if (e.code === "ArrowRight") { e.preventDefault(); cardsNext(); }
        else if (e.key && e.key.toLowerCase() === "k") { e.preventDefault(); cardsMark(true); }
        else if (e.key && e.key.toLowerCase() === "j") { e.preventDefault(); cardsMark(false); }
        return;
      }
      if (currentView === "write") return; // Tastatur über das Eingabefeld/Formular
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.code === "ArrowRight") { e.preventDefault(); jump(1); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); jump(-1); }
    });

    // Tabs
    document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => switchView(t.dataset.view)));

    // Quiz-Steuerung
    el.qMicBtn.addEventListener("click", () => { quiz.listening ? quizStopListen() : quizListen(); });
    el.qSolveBtn.addEventListener("click", quizReveal);
    el.qNextBtn.addEventListener("click", () => quizNext(true));
    el.qHearLatin.addEventListener("click", quizHearLatin);
    el.qTypeForm.addEventListener("submit", (e) => { e.preventDefault(); quizCheckTyped(el.qTypeInput.value); });
    el.qTypeInput.addEventListener("focus", () => { quiz.typing = true; quizStopListen(); });
    el.qTypeInput.addEventListener("blur", () => { quiz.typing = false; });
    const qToggle = (chk, key, rebuild) => chk.addEventListener("change", () => {
      state.settings[key] = chk.checked; save();
      if (rebuild && currentView === "quiz") { const keepPos = quiz.pos; buildQuizOrder(); quiz.pos = Math.min(keepPos, quiz.order.length - 1); updateQuizProgress(); }
    });
    qToggle(el.qShuffleToggle, "qShuffle", true);
    qToggle(el.qAutoToggle, "qAuto", false);
    qToggle(el.qSkipDoneToggle, "qSkipDone", true);
    el.qWakeToggle.addEventListener("change", () => { state.settings.qWake = el.qWakeToggle.checked; save(); updateWakeLock(); });

    // Schreiben-Steuerung
    el.wForm.addEventListener("submit", (e) => { e.preventDefault(); writeCheck(); });
    el.wSolveBtn.addEventListener("click", writeReveal);
    el.wNextBtn.addEventListener("click", writeNext);
    el.wHear.addEventListener("click", writeHear);
    const wToggle = (chk, key) => chk.addEventListener("change", () => { state.settings[key] = chk.checked; save(); if (currentView === "write") enterWrite(); });
    wToggle(el.wDirToggle, "wDir");
    wToggle(el.wShuffleToggle, "wShuffle");
    wToggle(el.wSkipDoneToggle, "wSkipDone");

    // Karten-Steuerung
    el.flashcard.addEventListener("click", () => { if (cardSwiped) { cardSwiped = false; return; } flipCard(); });
    el.flashcard.addEventListener("touchstart", (e) => { const t = e.changedTouches[0]; cardTouchX = t.clientX; cardTouchY = t.clientY; cardSwiped = false; }, { passive: true });
    el.flashcard.addEventListener("touchend", (e) => {
      const t = e.changedTouches[0]; const dx = t.clientX - cardTouchX, dy = t.clientY - cardTouchY;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { cardSwiped = true; if (dx < 0) cardsNext(); else cardsPrev(); }
    }, { passive: true });
    el.cHearFront.addEventListener("click", cardsHearFront);
    el.cPrevBtn.addEventListener("click", cardsPrev);
    el.cNextBtn.addEventListener("click", cardsNext);
    el.cKnownBtn.addEventListener("click", () => cardsMark(true));
    el.cUnknownBtn.addEventListener("click", () => cardsMark(false));
    const cToggle = (chk, key) => chk.addEventListener("change", () => { state.settings[key] = chk.checked; save(); if (currentView === "cards") enterCards(); });
    cToggle(el.cDirToggle, "cDir");
    cToggle(el.cShuffleToggle, "cShuffle");
    cToggle(el.cSkipDoneToggle, "cSkipDone");

    if (synth) synth.onvoiceschanged = loadVoices;
    window.addEventListener("beforeunload", () => synth && synth.cancel());
  }

  /* ============================================================
     ABFRAGE-MODUS (eigenständig)
     ============================================================ */

  /* ---------- Tonsignale ---------- */
  function ensureAudio() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function tone(freq, startOff, dur, vol, type) {
    try {
      const ctx = ensureAudio();
      const o = ctx.createOscillator(), g = ctx.createGain();
      const t = ctx.currentTime + (startOff || 0);
      o.type = type || "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol == null ? 0.2 : vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + dur);
    } catch (e) { /* Audio nicht verfügbar */ }
  }
  function successTone() { tone(660, 0, 0.15, 0.2); tone(988, 0.12, 0.22, 0.2); } // freundliches Ding-Ding
  function failTone() { tone(311, 0, 0.28, 0.16, "sine"); }

  /* ---------- Fehlertolerantes Matching ---------- */
  const STOP = new Set(["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines", "zu", "sich", "the", "to", "a", "an"]);

  function foldText(s) {
    return (s || "")
      .toLowerCase()
      .replace(/ß/g, "ss")
      .normalize("NFD").replace(/[̀-ͯ]/g, "") // Akzente/Umlautpunkte entfernen
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function contentTokens(s) { return foldText(s).split(" ").filter((t) => t && !STOP.has(t)); }

  // Trennt Mehrfachbedeutungen und macht Klammer-Inhalte optional:
  // "von dort; darauf; deshalb"  -> ["von dort", "darauf", "deshalb"]
  // "der Bürger (Einwohner)"     -> ["der Bürger", "der Bürger Einwohner", "Einwohner"]
  function expandVariants(s) {
    const out = [];
    for (let part of (s || "").split(/[,;/]|\boder\b|\bbzw\.?\b/i)) {
      part = part.trim();
      if (!part) continue;
      if (/[()[\]]/.test(part)) {
        const without = part.replace(/[([][^)\]]*[)\]]/g, " ").replace(/\s+/g, " ").trim();
        const inlined = part.replace(/[()[\]]/g, " ").replace(/\s+/g, " ").trim();
        const inner = (part.match(/[([]([^)\]]*)[)\]]/) || [])[1];
        if (without) out.push(without);          // ohne Klammer-Inhalt
        if (inlined && inlined !== without) out.push(inlined); // mit Klammer-Inhalt
        if (inner && inner.trim()) out.push(inner.trim());     // nur Klammer-Inhalt
      } else {
        out.push(part);
      }
    }
    return out.length ? out : [s || ""];
  }

  function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const dp = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      let prev = dp[0]; dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return dp[n];
  }
  function tokenMatch(a, b) {
    if (a === b) return true;
    const mx = Math.max(a.length, b.length), mn = Math.min(a.length, b.length);
    if (mn <= 3) return a === b;                       // sehr kurze Wörter: streng
    if ((a.includes(b) || b.includes(a)) && mn >= 4) return true; // Beugung/Plural
    const d = lev(a, b);
    if (mx <= 5) return d <= 1;
    if (mx <= 8) return d <= 2;
    return d <= Math.floor(mx * 0.34);
  }
  // Akzeptiert „adv adverb“ für „Adverb“, ignoriert Artikel/Füllwörter, erlaubt Tippfehler-Distanz
  function isCorrect(spoken, german) {
    const spTokens = contentTokens(spoken);
    if (!spTokens.length) return false;
    const spPhrase = spTokens.join(" ");
    for (const variant of expandVariants(german)) {
      const vTokens = contentTokens(variant);
      if (!vTokens.length) continue;
      const vPhrase = vTokens.join(" ");
      const mx = Math.max(spPhrase.length, vPhrase.length);
      if (mx > 0 && lev(spPhrase, vPhrase) <= Math.max(1, Math.floor(mx * 0.25))) return true; // ganze Phrase ähnlich
      if (vTokens.every((vt) => spTokens.some((st) => tokenMatch(st, vt)))) return true;        // alle Lösungswörter vorhanden
    }
    return false;
  }
  const isGiveUp = (text) => /(weiß nicht|weiss nicht|keine ahnung|keinen plan|lösung|loesung|aufgeben|verraten)/.test(foldText(text));

  /* ---------- Quiz-Ablauf ---------- */
  const currentQuizVocab = () => state.vocab[quiz.order[quiz.pos]];

  function buildQuizOrder() {
    let idx = state.vocab.map((_, i) => i);
    if (state.settings.qSkipDone) idx = idx.filter((i) => !state.vocab[i].done);
    if (state.settings.qShuffle) {
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
    }
    quiz.order = idx;
  }

  function setQStatus(text, cls) {
    el.qStatus.textContent = text;
    el.qStatus.className = "q-status" + (cls ? " " + cls : "");
  }
  function showAnswer(text, cls) {
    el.qAnswer.textContent = text;
    el.qAnswer.className = "q-answer" + (cls ? " " + cls : "");
    el.qAnswer.hidden = false;
  }
  function updateQuizProgress() { el.qProgress.textContent = `${quiz.pos + 1} von ${quiz.order.length}`; }
  function updateQuizScore() {
    el.qScore.innerHTML = quiz.completedCount
      ? `Richtig: <strong>${quiz.correctCount}</strong> von ${quiz.completedCount}`
      : "";
  }

  function enterQuiz() {
    pause();                          // Hören-Wiedergabe stoppen
    if (recognitionOn) stopVoice();   // Hören-Sprachsteuerung stoppen (nur ein Recognizer aktiv)
    quiz.correctCount = 0; quiz.completedCount = 0; quiz.finished = false; quiz.pos = -1;
    updateQuizScore();
    buildQuizOrder();
    if (!quiz.order.length) { quizRenderEmpty(); return; }
    el.qEmptyState.hidden = true;
    document.querySelector(".quiz").hidden = false;
    updateWakeLock();
    quizNext(false);                  // erste Vokabel zeigen, noch nicht zuhören (Berechtigung via Tap)
  }

  function quizRenderEmpty() {
    const empty = quiz.order.length === 0;
    el.qEmptyState.hidden = !empty;
    document.querySelector(".quiz").hidden = empty;
  }

  function quizShow() {
    const v = currentQuizVocab();
    if (!v) return;
    quiz.currentId = v.id;
    quiz.revealed = false;
    quiz.justAnswered = false;
    el.qLatin.textContent = v.latin;
    el.qAnswer.hidden = true; el.qAnswer.className = "q-answer";
    setTranscript("", false);
    el.qTypeInput.value = "";
    setQStatus("Sprich die deutsche Übersetzung – oder tippe sie.", "");
    updateQuizProgress();
  }

  function quizNext(auto) {
    quizStopListen();
    if (synth) synth.cancel();
    if (quiz.finished) { enterQuiz(); return; }
    if (!quiz.order.length) { buildQuizOrder(); quiz.pos = -1; }
    if (!quiz.order.length) { quizRenderEmpty(); return; }
    quiz.pos++;
    if (quiz.pos >= quiz.order.length) { quizFinish(); return; }
    quizShow();
    if (auto && state.settings.qAuto && quizArmed) quizListen();
  }

  function quizFinish() {
    quizStopListen();
    quiz.finished = true;
    el.qLatin.textContent = "Fertig";
    el.qAnswer.hidden = true;
    setQStatus(`${quiz.correctCount} von ${quiz.completedCount} richtig – „Weiter“ für neue Runde.`, "is-ok");
    el.qProgress.textContent = `${quiz.order.length} von ${quiz.order.length}`;
  }

  function ensureQuizReco() {
    if (quizReco) return quizReco;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    quizReco = new SR();
    quizReco.lang = "de-DE";
    quizReco.continuous = false;
    quizReco.interimResults = true;
    quizReco.maxAlternatives = 5;
    quizReco.onresult = quizRecoResult;
    quizReco.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast("Mikrofon-Zugriff verweigert.");
        quizArmed = false;
        quizStopListen();
      }
    };
    quizReco.onend = quizRecoEnd;
    return quizReco;
  }

  function quizListen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("Spracherkennung wird in diesem Browser nicht unterstützt."); return; }
    if (!currentQuizVocab() || quiz.revealed || quiz.finished) return;
    ensureQuizReco();
    ensureAudio();               // Audiokontext im Nutzer-Tap freischalten (für Töne)
    quizArmed = true;
    quiz.listening = true;
    el.qMicBtn.classList.add("is-listening");
    setQStatus("Hört zu …", "is-listening");
    try { quizReco.start(); } catch (e) { /* läuft bereits */ }
  }

  function quizStopListen() {
    quiz.listening = false;
    el.qMicBtn.classList.remove("is-listening");
    if (quizReco) { quizReco.onend = null; try { quizReco.stop(); } catch (e) {} quizReco.onend = quizRecoEnd; }
  }

  function setTranscript(text, final) {
    el.qTranscript.textContent = text ? `„${text}“` : "";
    el.qTranscript.classList.toggle("is-final", !!final);
  }

  function quizRecoResult(e) {
    let finalText = "", interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (interim.trim()) setTranscript(interim.trim(), false); // Live-Transkript
    if (!finalText) return;
    setTranscript(finalText.trim(), true);
    const last = e.results[e.results.length - 1];
    const alts = [];
    for (let i = 0; i < last.length; i++) alts.push(last[i].transcript);
    quizEvaluate(alts);
  }

  function quizCheckTyped(text) {
    text = (text || "").trim();
    if (!text || quiz.finished || quiz.revealed) return;
    quizStopListen();
    setTranscript(text, true);
    quizEvaluate([text]);
  }

  function quizRecoEnd() {
    quiz.listening = false;
    el.qMicBtn.classList.remove("is-listening");
    // Hände-frei: bei Stille erneut zuhören, solange im Quiz und unbeantwortet
    if (currentView === "quiz" && state.settings.qAuto && quizArmed && !quiz.revealed && !quiz.finished && !quiz.justAnswered && !quiz.typing) {
      setTimeout(() => {
        if (currentView === "quiz" && !quiz.listening && !quiz.revealed && !quiz.finished && !quiz.typing) quizListen();
      }, 250);
    }
  }

  function quizEvaluate(alts) {
    const v = currentQuizVocab();
    if (!v) return;
    if (alts.some((a) => isGiveUp(a))) { quizReveal(); return; }
    if (alts.some((a) => isCorrect(a, v.german))) quizHandleCorrect();
    else quizHandleWrong(alts[0] || "");
  }

  function quizHandleCorrect() {
    const v = currentQuizVocab();
    quiz.justAnswered = true;
    quizStopListen();
    successTone();
    showAnswer(v.german, "is-ok");
    setQStatus("Richtig!", "is-ok");
    quiz.correctCount++; quiz.completedCount++;
    updateQuizScore();
    if (v && !v.done) { v.done = true; save(); renderList(); updateProgress(); } // zählt als gelernt
    setTimeout(() => quizNext(true), 1150);
  }

  function quizHandleWrong(heard) {
    setQStatus(heard ? `Noch nicht: „${heard}“ – nochmal oder „Lösung“.` : "Nicht verstanden – nochmal oder „Lösung“.", "is-wrong");
    // quizRecoEnd startet (bei Auto) automatisch erneut für den nächsten Versuch
  }

  async function quizReveal() {
    const v = currentQuizVocab();
    if (!v) return;
    quiz.justAnswered = true;
    quizStopListen();
    quiz.revealed = true;
    quiz.completedCount++;
    updateQuizScore();
    showAnswer(v.german, "is-reveal");
    setQStatus("Lösung wird vorgelesen …", "is-wrong");
    failTone();
    await speak(v.german, state.settings.germanVoiceURI, "de-DE");
    if (currentView === "quiz" && state.settings.qAuto && quizArmed) setTimeout(() => quizNext(true), 700);
  }

  function quizHearLatin() {
    const v = currentQuizVocab();
    if (v) speak(v.latin, state.settings.latinVoiceURI, "it-IT");
  }

  /* ============================================================
     SCHREIBEN-MODUS
     ============================================================ */
  const currentWriteVocab = () => state.vocab[write.order[write.pos]];
  const writePrompt = (v) => (state.settings.wDir ? v.german : v.latin);
  const writeTarget = (v) => (state.settings.wDir ? v.latin : v.german);

  function buildWriteOrder() {
    let idx = state.vocab.map((_, i) => i);
    if (state.settings.wSkipDone) idx = idx.filter((i) => !state.vocab[i].done);
    if (state.settings.wShuffle) {
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    }
    write.order = idx;
  }
  function writeRenderEmpty() {
    const empty = write.order.length === 0;
    el.wEmptyState.hidden = !empty;
    document.querySelector(".write").hidden = empty;
  }
  function setWStatus(t, cls) { el.wStatus.textContent = t; el.wStatus.className = "q-status" + (cls ? " " + cls : ""); }
  function showWAnswer(t, cls) { el.wAnswer.textContent = t; el.wAnswer.className = "q-answer" + (cls ? " " + cls : ""); el.wAnswer.hidden = false; }
  function updateWriteProgress() { el.wProgress.textContent = `${write.pos + 1} von ${write.order.length}`; }
  function updateWriteScore() { el.wScore.innerHTML = write.completedCount ? `Richtig: <strong>${write.correctCount}</strong> von ${write.completedCount}` : ""; }

  function enterWrite() {
    write.correctCount = 0; write.completedCount = 0; write.finished = false; write.pos = -1;
    updateWriteScore();
    buildWriteOrder();
    if (!write.order.length) { writeRenderEmpty(); return; }
    el.wEmptyState.hidden = true;
    document.querySelector(".write").hidden = false;
    writeNext();
  }

  function writeShow() {
    const v = currentWriteVocab(); if (!v) return;
    write.answered = false;
    el.wHint.textContent = state.settings.wDir ? "Übersetze ins Lateinische" : "Übersetze ins Deutsche";
    el.wPrompt.textContent = writePrompt(v);
    el.wInput.value = ""; el.wInput.className = "w-input"; el.wInput.disabled = false;
    el.wAnswer.hidden = true; el.wAnswer.className = "q-answer";
    el.wCheckBtn.textContent = "Prüfen";
    setWStatus("Tippe die Übersetzung und drücke Enter.", "");
    updateWriteProgress();
    if (currentView === "write") el.wInput.focus();
  }

  function writeNext() {
    if (synth) synth.cancel();
    if (write.finished) { enterWrite(); return; }
    if (!write.order.length) { buildWriteOrder(); write.pos = -1; }
    if (!write.order.length) { writeRenderEmpty(); return; }
    write.pos++;
    if (write.pos >= write.order.length) { writeFinish(); return; }
    writeShow();
  }

  function writeFinish() {
    write.finished = true;
    el.wPrompt.textContent = "Fertig";
    el.wInput.value = ""; el.wInput.disabled = true; el.wAnswer.hidden = true;
    el.wCheckBtn.textContent = "Neue Runde";
    setWStatus(`${write.correctCount} von ${write.completedCount} richtig – „Weiter“ für neue Runde.`, "is-ok");
    el.wProgress.textContent = `${write.order.length} von ${write.order.length}`;
  }

  function writeCheck() {
    if (write.finished) { enterWrite(); return; }
    if (write.answered) { writeNext(); return; }   // Enter nach Antwort = weiter
    const v = currentWriteVocab(); if (!v) return;
    const text = el.wInput.value.trim();
    if (!text) return;
    if (isGiveUp(text)) { writeReveal(); return; }
    if (isCorrect(text, writeTarget(v))) {
      write.answered = true;
      write.correctCount++; write.completedCount++; updateWriteScore();
      el.wInput.className = "w-input is-ok"; el.wInput.disabled = true;
      el.wCheckBtn.textContent = "Weiter";
      successTone();
      showWAnswer(writeTarget(v), "is-ok");
      setWStatus("Richtig! Enter für weiter.", "is-ok");
      if (!state.settings.wDir && !v.done) { v.done = true; save(); renderList(); updateProgress(); }
    } else {
      el.wInput.className = "w-input is-wrong";
      setWStatus("Noch nicht – nochmal versuchen oder „Lösung“.", "is-wrong");
      el.wInput.select();
    }
  }

  function writeReveal() {
    if (write.finished) return;
    const v = currentWriteVocab(); if (!v) return;
    if (!write.answered) { write.completedCount++; updateWriteScore(); }
    write.answered = true;
    el.wInput.disabled = true; el.wInput.className = "w-input is-wrong";
    el.wCheckBtn.textContent = "Weiter";
    showWAnswer(writeTarget(v), "is-reveal");
    setWStatus("Lösung – Enter für weiter.", "is-wrong");
    failTone();
    if (state.settings.wDir) speak(v.latin, state.settings.latinVoiceURI, "it-IT");
    else speak(v.german, state.settings.germanVoiceURI, "de-DE");
  }

  function writeHear() {
    const v = currentWriteVocab(); if (!v) return;
    if (state.settings.wDir) speak(v.german, state.settings.germanVoiceURI, "de-DE");
    else speak(v.latin, state.settings.latinVoiceURI, "it-IT");
  }

  /* ============================================================
     KARTEN-MODUS (Flashcards)
     ============================================================ */
  const currentCardVocab = () => state.vocab[cards.order[cards.pos]];

  function buildCardsOrder() {
    let idx = state.vocab.map((_, i) => i);
    if (state.settings.cSkipDone) idx = idx.filter((i) => !state.vocab[i].done);
    if (state.settings.cShuffle) {
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    }
    cards.order = idx;
  }
  function cardsRenderEmpty() {
    const empty = cards.order.length === 0;
    el.cEmptyState.hidden = !empty;
    document.querySelector(".cards").hidden = empty;
  }
  function updateCardsProgress() { el.cProgress.textContent = `${cards.pos + 1} von ${cards.order.length}`; }
  function updateCardsScore() {
    const done = state.vocab.filter((v) => v.done).length;
    el.cScore.innerHTML = `Gelernt: <strong>${done}</strong> von ${state.vocab.length}`;
  }

  function enterCards() {
    buildCardsOrder();
    cards.pos = -1;
    updateCardsScore();
    if (!cards.order.length) { cardsRenderEmpty(); return; }
    el.cEmptyState.hidden = true;
    document.querySelector(".cards").hidden = false;
    cardsNext();
  }

  function cardsShow() {
    const v = currentCardVocab(); if (!v) return;
    cards.flipped = false;
    el.flashcard.classList.remove("is-flipped");
    const frontGerman = state.settings.cDir;
    el.cFrontLabel.textContent = frontGerman ? "Deutsch" : "Latein";
    el.cBackLabel.textContent = frontGerman ? "Latein" : "Deutsch";
    el.cFront.textContent = frontGerman ? v.german : v.latin;
    el.cBack.textContent = frontGerman ? v.latin : v.german;
    el.cForms.textContent = v.forms || "";
    el.cForms.hidden = !v.forms;
    updateCardsProgress();
  }

  function flipCard() { cards.flipped = !cards.flipped; el.flashcard.classList.toggle("is-flipped", cards.flipped); }

  function cardsNext() {
    if (synth) synth.cancel();
    if (!cards.order.length) { buildCardsOrder(); cards.pos = -1; }
    if (!cards.order.length) { cardsRenderEmpty(); return; }
    cards.pos = (cards.pos + 1) % cards.order.length;
    cardsShow();
  }
  function cardsPrev() {
    if (synth) synth.cancel();
    if (!cards.order.length) return;
    cards.pos = (cards.pos - 1 + cards.order.length) % cards.order.length;
    cardsShow();
  }

  function cardsMark(known) {
    const v = currentCardVocab();
    if (v && v.done !== known) { v.done = known; save(); renderList(); updateProgress(); }
    updateCardsScore();
    if (state.settings.cSkipDone && known) {
      buildCardsOrder();
      if (!cards.order.length) { cardsRenderEmpty(); return; }
      if (cards.pos >= cards.order.length) cards.pos = 0;
      cardsShow();              // an gleicher Position steht nun die nächste Karte
    } else {
      cardsNext();
    }
  }

  function cardsHearFront(e) {
    if (e) e.stopPropagation();
    const v = currentCardVocab(); if (!v) return;
    if (state.settings.cDir) speak(v.german, state.settings.germanVoiceURI, "de-DE");
    else speak(v.latin, state.settings.latinVoiceURI, "it-IT");
  }

  /* ---------- Ansicht wechseln ---------- */
  const VIEWS = ["listen", "quiz", "write", "cards", "manage"];

  function switchView(view) {
    if (view === currentView || !VIEWS.includes(view)) return;
    // Globaler Teardown des alten Modus
    pause();
    if (recognitionOn) stopVoice();
    quizStopListen();
    if (synth) synth.cancel();

    currentView = view;
    VIEWS.forEach((v) => { const node = document.getElementById("view-" + v); if (node) node.hidden = v !== view; });
    document.querySelectorAll(".tab").forEach((t) => {
      const on = t.dataset.view === view;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      if (on && t.scrollIntoView) t.scrollIntoView({ inline: "center", block: "nearest" });
    });

    if (view === "quiz") enterQuiz();
    else if (view === "write") enterWrite();
    else if (view === "cards") enterCards();
    else if (view === "listen" && !player.playing && player.pos < 0) setNpState("", "Bereit");

    updateWakeLock();
    try { localStorage.setItem("vt.view", view); } catch (e) {}
  }

  /* ---------- Init ---------- */
  function init() {
    if (!("speechSynthesis" in window)) toast("Dein Browser unterstützt keine Sprachausgabe.");
    load();
    checkSharedDeck();
    // seqCounter hinter den höchsten geladenen Wert setzen
    seqCounter = state.vocab.reduce((m, v) => Math.max(m, (v.seq ?? 0) + 1), 0);
    updatePlayButton();
    applySettingsToUI();
    applyDeckTitle();
    bindEvents();
    setupMediaSession();
    loadVoices();
    renderList();
    updateProgress();
    // Ohne Vokabeln direkt in den Vokabeln-Tab, sonst zuletzt genutzten Tab
    let lastView = "listen";
    try { lastView = localStorage.getItem("vt.view") || "listen"; } catch (e) {}
    if (!state.vocab.length) lastView = "manage";
    if (VIEWS.includes(lastView) && lastView !== "listen") switchView(lastView);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
