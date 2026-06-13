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
      theme: "light",
    },
  };

  const player = { playing: false, order: [], pos: -1, currentId: null, cancel: false, timer: null };

  let voices = [];
  let editingId = null;
  let seqCounter = 0;
  let audioCtx = null;

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
      u.onend = resolve;
      u.onerror = resolve;
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
    playLoop();
  }

  function pause() {
    player.playing = false;
    player.cancel = true;
    if (synth) synth.cancel();
    clearTimeout(player.timer);
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

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const arr = Array.isArray(data) ? data : data.vocab;
        if (!Array.isArray(arr)) throw new Error("Kein Vokabel-Array gefunden.");
        if (data.title) state.title = data.title;
        seqCounter = 0;
        state.vocab = arr.map((v, i) => normalize({ ...v, seq: i })).filter((v) => v.latin && v.german);
        seqCounter = state.vocab.length;
        applyDeckTitle();
        save(); renderList(); updateProgress();
        toast(`${state.vocab.length} Vokabeln importiert.`);
      } catch (err) {
        toast("Import fehlgeschlagen: ungültige JSON-Datei.");
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

  function applyDeckTitle() { el.deckTitle.textContent = state.title; }

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
    el.fileInput.addEventListener("change", () => { if (el.fileInput.files[0]) importJSON(el.fileInput.files[0]); el.fileInput.value = ""; });
    el.sampleBtn.addEventListener("click", loadSample);
    el.emptySample.addEventListener("click", loadSample);

    el.editForm.addEventListener("submit", submitEdit);
    el.cancelEdit.addEventListener("click", () => el.dialog.close());

    el.themeToggle.addEventListener("click", () => { applyTheme(state.settings.theme === "dark" ? "light" : "dark"); save(); });

    document.addEventListener("keydown", (e) => {
      if (el.dialog.open) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.code === "ArrowRight") { e.preventDefault(); jump(1); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); jump(-1); }
    });

    if (synth) synth.onvoiceschanged = loadVoices;
    window.addEventListener("beforeunload", () => synth && synth.cancel());
  }

  /* ---------- Init ---------- */
  function init() {
    if (!("speechSynthesis" in window)) toast("Dein Browser unterstützt keine Sprachausgabe.");
    load();
    // seqCounter hinter den höchsten geladenen Wert setzen
    seqCounter = state.vocab.reduce((m, v) => Math.max(m, (v.seq ?? 0) + 1), 0);
    updatePlayButton();
    applySettingsToUI();
    applyDeckTitle();
    bindEvents();
    loadVoices();
    renderList();
    updateProgress();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
