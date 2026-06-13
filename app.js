/* ============================================================
   Vokabeltrainer – Logik
   Reine Browser-App (Web Speech API + localStorage).
   ============================================================ */
(() => {
  "use strict";

  const synth = window.speechSynthesis;
  const STORE_KEY = "vokabeltrainer.state.v1";

  /* ---------- State ---------- */
  const state = {
    vocab: [],          // [{ id, latin, german, forms, done }]
    title: "Latein · Audio",
    settings: {
      pauseBetween: 5,   // s zwischen Latein und Deutsch
      pauseAfter: 1.5,   // s nach jeder Vokabel
      rate: 0.9,
      repeatLatin: 1,
      latinVoiceURI: "",
      germanVoiceURI: "",
      shuffle: false,
      loop: false,
      readForms: false,
      skipDone: true,
      theme: "light",
    },
  };

  // Wiedergabe-Status
  const player = {
    playing: false,
    order: [],          // Indizes in Abspielreihenfolge
    pos: -1,            // Position innerhalb order
    currentId: null,
    cancel: false,      // Flag, um laufende Sequenz abzubrechen
    timer: null,        // aktiver setTimeout
  };

  let voices = [];
  let editingId = null;

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    deckTitle: $("deckTitle"),
    npWrap: $("nowPlaying"), npLabel: document.querySelector(".np-label"),
    npLatin: $("npLatin"), npGerman: $("npGerman"), npForms: $("npForms"),
    progressBar: $("progressBar"), progressText: $("progressText"),
    prevBtn: $("prevBtn"), playBtn: $("playBtn"), nextBtn: $("nextBtn"),
    shuffleToggle: $("shuffleToggle"), loopToggle: $("loopToggle"),
    readFormsToggle: $("readFormsToggle"), skipDoneToggle: $("skipDoneToggle"),
    pauseBetween: $("pauseBetween"), pauseBetweenVal: $("pauseBetweenVal"),
    pauseAfter: $("pauseAfter"), pauseAfterVal: $("pauseAfterVal"),
    rate: $("rate"), rateVal: $("rateVal"),
    repeatLatin: $("repeatLatin"), repeatLatinVal: $("repeatLatinVal"),
    latinVoice: $("latinVoice"), germanVoice: $("germanVoice"),
    list: $("vocabList"), emptyState: $("emptyState"), countPill: $("countPill"),
    search: $("searchInput"),
    addBtn: $("addBtn"), checkAllBtn: $("checkAllBtn"), uncheckAllBtn: $("uncheckAllBtn"),
    importBtn: $("importBtn"), exportBtn: $("exportBtn"), sampleBtn: $("sampleBtn"),
    fileInput: $("fileInput"), emptySample: $("emptySample"),
    themeToggle: $("themeToggle"),
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
    } catch (e) { /* Speicher evtl. voll/blockiert – ignorieren */ }
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
      latin: String(v.latin ?? "").trim(),
      german: String(v.german ?? "").trim(),
      forms: String(v.forms ?? "").trim(),
      done: !!v.done,
    };
  }

  /* ---------- Voices ---------- */
  function loadVoices() {
    voices = synth.getVoices();
    if (!voices.length) return;
    fillVoiceSelect(el.latinVoice, ["it", "la"], state.settings.latinVoiceURI);
    fillVoiceSelect(el.germanVoice, ["de"], state.settings.germanVoiceURI);
  }

  function fillVoiceSelect(select, preferLangs, savedURI) {
    select.innerHTML = "";
    // Sortiere bevorzugte Sprachen nach oben
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
    // Auswahl wiederherstellen oder erste passende nehmen
    if (savedURI && sorted.some((v) => v.voiceURI === savedURI)) {
      select.value = savedURI;
    } else {
      const pref = sorted.find((v) => preferLangs.some((l) => v.lang.toLowerCase().startsWith(l)));
      if (pref) select.value = pref.voiceURI;
    }
  }

  const voiceByURI = (uri) => voices.find((v) => v.voiceURI === uri);

  /* ---------- Sprechen ---------- */
  function speak(text, voiceURI, fallbackLang) {
    return new Promise((resolve) => {
      if (!text) return resolve();
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

  // Abbrechbares Warten
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
        // Reihenfolge neu aufbauen (z. B. nach Abhaken)
        buildOrder();
        if (!player.order.length) { stop(); toast("Keine offenen Vokabeln zum Abspielen."); return; }
        player.pos = 0;
      }

      const vIndex = player.order[player.pos];
      const v = state.vocab[vIndex];
      if (!v) { player.pos++; continue; }

      player.currentId = v.id;
      renderNowPlaying(v);
      renderList();
      updateProgress();

      // 1) Latein (ggf. mit Formen / mehrfach)
      setNpState("speaking-latin", "Latein");
      const latinText = state.settings.readForms && v.forms ? `${v.latin}. ${v.forms}` : v.latin;
      for (let r = 0; r < state.settings.repeatLatin && !player.cancel; r++) {
        await speak(latinText, state.settings.latinVoiceURI, "it-IT");
        if (r < state.settings.repeatLatin - 1) await wait(0.6);
      }
      if (player.cancel) break;

      // 2) Pause Latein → Deutsch
      setNpState("", "Pause …");
      await wait(state.settings.pauseBetween);
      if (player.cancel) break;

      // 3) Deutsch
      setNpState("speaking-german", "Deutsch");
      await speak(v.german, state.settings.germanVoiceURI, "de-DE");
      if (player.cancel) break;

      // 4) Pause nach Vokabel
      setNpState("", "");
      await wait(state.settings.pauseAfter);
      if (player.cancel) break;

      // Weiter
      player.pos++;
      if (player.pos >= player.order.length) {
        if (state.settings.loop) { player.pos = -1; }
        else { stop(); toast("Fertig! 🎉"); return; }
      }
    }
  }

  function setNpState(cls, label) {
    el.npWrap.classList.remove("speaking-latin", "speaking-german");
    if (cls) el.npWrap.classList.add(cls);
    if (label !== undefined) el.npLabel.textContent = label;
  }

  /* ---------- Steuerung ---------- */
  function play() {
    if (!state.vocab.length) { toast("Bitte zuerst Vokabeln hinzufügen."); return; }
    if (player.playing) return;
    if (player.pos < 0) buildOrder();
    playLoop();
  }

  function pause() {
    player.playing = false;
    player.cancel = true;
    synth.cancel();
    clearTimeout(player.timer);
    setNpState("", "Pausiert");
    updatePlayButton();
  }

  function stop() {
    player.playing = false;
    player.cancel = true;
    player.pos = -1;
    player.currentId = null;
    synth.cancel();
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
    synth.cancel();
    clearTimeout(player.timer);
    if (!player.order.length) buildOrder();
    if (!player.order.length) return;
    if (player.pos < 0) player.pos = 0;
    player.pos = (player.pos + delta + player.order.length) % player.order.length;
    if (wasPlaying) {
      player.playing = false; // Schleife beenden lassen, dann neu starten
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
    el.playBtn.textContent = player.playing ? "⏸" : "▶";
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

  function renderList() {
    const q = el.search.value.trim().toLowerCase();
    el.list.innerHTML = "";
    const filtered = state.vocab.filter((v) =>
      !q || v.latin.toLowerCase().includes(q) || v.german.toLowerCase().includes(q) || v.forms.toLowerCase().includes(q)
    );

    el.emptyState.hidden = state.vocab.length !== 0;
    el.countPill.textContent = `${activeCount()}/${state.vocab.length}`;

    for (const v of filtered) {
      const li = document.createElement("li");
      li.className = "vocab-item" + (v.done ? " is-done" : "") + (v.id === player.currentId ? " is-current" : "");

      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.className = "vi-check"; cb.checked = v.done;
      cb.setAttribute("aria-label", `"${v.latin}" als gelernt markieren`);
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
      const playBtn = mkBtn("▶", "Diese Vokabel abspielen", () => playOne(v.id));
      playBtn.classList.add("play-one");
      const editBtn = mkBtn("✎", "Bearbeiten", () => openEdit(v.id));
      const delBtn = mkBtn("🗑", "Löschen", () => removeVocab(v.id));
      actions.append(playBtn, editBtn, delBtn);

      li.append(cb, text, actions);
      el.list.appendChild(li);
    }
  }

  function mkBtn(label, title, onClick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "vi-btn"; b.textContent = label;
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
    const data = {
      latin: el.fLatin.value.trim(),
      german: el.fGerman.value.trim(),
      forms: el.fForms.value.trim(),
    };
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
        state.vocab = arr.map(normalize).filter((v) => v.latin && v.german);
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
    state.vocab = SAMPLE.vocab.map(normalize);
    applyDeckTitle();
    save(); renderList(); updateProgress();
    toast("Beispiel geladen.");
  }

  function applyDeckTitle() { el.deckTitle.textContent = state.title; }

  /* ---------- Settings UI ---------- */
  function applySettingsToUI() {
    const s = state.settings;
    el.pauseBetween.value = s.pauseBetween; el.pauseBetweenVal.textContent = fmt(s.pauseBetween);
    el.pauseAfter.value = s.pauseAfter; el.pauseAfterVal.textContent = fmt(s.pauseAfter);
    el.rate.value = s.rate; el.rateVal.textContent = fmt(s.rate);
    el.repeatLatin.value = s.repeatLatin; el.repeatLatinVal.textContent = s.repeatLatin;
    el.shuffleToggle.checked = s.shuffle;
    el.loopToggle.checked = s.loop;
    el.readFormsToggle.checked = s.readForms;
    el.skipDoneToggle.checked = s.skipDone;
    applyTheme(s.theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelector(".theme-icon").textContent = theme === "dark" ? "☀" : "☾";
    state.settings.theme = theme;
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    el.playBtn.addEventListener("click", togglePlay);
    el.prevBtn.addEventListener("click", () => jump(-1));
    el.nextBtn.addEventListener("click", () => jump(1));

    // Toggles
    const toggle = (chk, key, opts = {}) => chk.addEventListener("change", () => {
      state.settings[key] = chk.checked; save();
      if (opts.rebuild && player.pos < 0) buildOrder();
      if (opts.rebuild) updateProgress();
    });
    toggle(el.shuffleToggle, "shuffle", { rebuild: true });
    toggle(el.loopToggle, "loop");
    toggle(el.readFormsToggle, "readForms");
    toggle(el.skipDoneToggle, "skipDone", { rebuild: true });

    // Slider
    const slider = (input, valEl, key, isInt) => input.addEventListener("input", () => {
      const val = isInt ? parseInt(input.value, 10) : parseFloat(input.value);
      state.settings[key] = val;
      valEl.textContent = isInt ? val : fmt(val);
      save();
    });
    slider(el.pauseBetween, el.pauseBetweenVal, "pauseBetween");
    slider(el.pauseAfter, el.pauseAfterVal, "pauseAfter");
    slider(el.rate, el.rateVal, "rate");
    slider(el.repeatLatin, el.repeatLatinVal, "repeatLatin", true);

    // Voices
    el.latinVoice.addEventListener("change", () => { state.settings.latinVoiceURI = el.latinVoice.value; save(); });
    el.germanVoice.addEventListener("change", () => { state.settings.germanVoiceURI = el.germanVoice.value; save(); });

    // List actions
    el.addBtn.addEventListener("click", () => openEdit(null));
    el.checkAllBtn.addEventListener("click", () => { state.vocab.forEach((v) => v.done = true); save(); renderList(); updateProgress(); });
    el.uncheckAllBtn.addEventListener("click", () => { state.vocab.forEach((v) => v.done = false); save(); renderList(); updateProgress(); });
    el.search.addEventListener("input", renderList);

    // Import / export / sample
    el.exportBtn.addEventListener("click", exportJSON);
    el.importBtn.addEventListener("click", () => el.fileInput.click());
    el.fileInput.addEventListener("change", () => { if (el.fileInput.files[0]) importJSON(el.fileInput.files[0]); el.fileInput.value = ""; });
    el.sampleBtn.addEventListener("click", loadSample);
    el.emptySample.addEventListener("click", loadSample);

    // Dialog
    el.editForm.addEventListener("submit", submitEdit);
    el.cancelEdit.addEventListener("click", () => el.dialog.close());

    // Theme
    el.themeToggle.addEventListener("click", () => { applyTheme(state.settings.theme === "dark" ? "light" : "dark"); save(); });

    // Keyboard
    document.addEventListener("keydown", (e) => {
      if (el.dialog.open) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.code === "ArrowRight") { e.preventDefault(); jump(1); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); jump(-1); }
    });

    // Stimmen laden (Chrome lädt asynchron)
    if (synth) synth.onvoiceschanged = loadVoices;

    // Vor dem Schließen Sprachausgabe stoppen
    window.addEventListener("beforeunload", () => synth && synth.cancel());
  }

  /* ---------- Init ---------- */
  function init() {
    if (!("speechSynthesis" in window)) {
      toast("Dein Browser unterstützt keine Sprachausgabe.");
    }
    const had = load();
    applySettingsToUI();
    applyDeckTitle();
    if (!had || !state.vocab.length) {
      // beim ersten Besuch nichts erzwingen – Empty-State zeigen
    }
    bindEvents();
    loadVoices();
    renderList();
    updateProgress();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
