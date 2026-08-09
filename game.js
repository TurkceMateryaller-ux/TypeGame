(() => {
  "use strict";

  const WORDS = {
    ru: {
      animals: ["кот","пёс","лиса","волк","тигр","лев","заяц","белка","мышь","ёж","утка","гусь","сова","орёл","панда","зебра","жираф","дельфин","кенгуру","черепаха","крокодил","носорог","пингвин","муравей","бабочка"],
      space: ["луна","марс","звезда","комета","земля","космос","ракета","орбита","спутник","планета","галактика","телескоп","астероид","космонавт","созвездие","вселенная","невесомость","метеорит","скафандр","станция","экипаж","кратер","затмение","солнце","меркурий"],
      school: ["урок","мел","ручка","книга","доска","класс","пенал","карта","глобус","задача","тетрадь","линейка","учитель","дневник","перемена","карандаш","учебник","библиотека","география","математика","литература","расписание","лаборатория","упражнение","информатика"],
      food: ["сыр","сок","хлеб","рис","суп","слива","груша","яблоко","молоко","морковь","картофель","помидор","огурец","печенье","мороженое","макароны","апельсин","земляника","бутерброд","виноград","кукуруза","йогурт","пирожок","капуста","абрикос"],
      sport: ["мяч","бег","гол","матч","спорт","прыжок","лыжи","теннис","шайба","ворота","команда","победа","тренер","стадион","бассейн","разминка","гимнастика","волейбол","баскетбол","футболист","соревнование","тренировка","велосипед","плавание","эстафета"]
    },
    tr: {
      animals: ["arı","ayı","kuş","kedi","köpek","tilki","kurt","aslan","kaplan","tavşan","sincap","fare","kirpi","ördek","kaz","baykuş","kartal","panda","zebra","zürafa","yunus","kanguru","kaplumbağa","timsah","kelebek"],
      space: ["ay","mars","yıldız","dünya","uzay","roket","yörünge","uydu","gezegen","galaksi","teleskop","asteroit","astronot","takımyıldız","evren","ağırlıksızlık","göktaşı","uzaygiysisi","istasyon","mürettebat","krater","tutulma","güneş","merkür","kuyrukluyıldız"],
      school: ["ders","kalem","kitap","tahta","sınıf","çanta","harita","küre","soru","defter","cetvel","öğretmen","günlük","teneffüs","kurşunkalem","derslik","kütüphane","coğrafya","matematik","edebiyat","program","laboratuvar","alıştırma","bilgisayar","öğrenci"],
      food: ["su","çay","peynir","ekmek","pirinç","çorba","erik","armut","elma","süt","havuç","patates","domates","salatalık","kurabiye","dondurma","makarna","portakal","çilek","sandviç","üzüm","mısır","yoğurt","kayısı","lahana"],
      sport: ["top","koşu","gol","maç","spor","atlama","kayak","tenis","pota","takım","zafer","antrenör","stadyum","havuz","ısınma","jimnastik","voleybol","basketbol","futbolcu","yarışma","antrenman","bisiklet","yüzme","bayrakyarışı","kaleci"]
    }
  };

  const CONFIG = {
    easy: { count: 10, energy: 5, min: 2, max: 6, duration: 19000 },
    medium: { count: 15, energy: 4, min: 5, max: 9, duration: 14500 },
    hard: { count: 20, energy: 3, min: 7, max: 30, duration: 11500 }
  };
  const TOPICS = ["animals", "space", "school", "food", "sport"];
  const TOPIC_NAMES = { animals: "Животные", space: "Космос", school: "Школа", food: "Еда", sport: "Спорт" };
  const STORAGE_KEY = "spaceTranslator.v1";
  const $ = id => document.getElementById(id);
  const screens = [...document.querySelectorAll(".screen")];
  const els = Object.fromEntries(["homeScreen","setupScreen","gameScreen","resultScreen","soundButton","startButton","howButton","bestScore","setupBack","launchButton","missionLabel","scoreValue","progressValue","streakValue","timeValue","accuracyValue","pauseButton","flightZone","energyPips","toast","wordCapsule","targetWord","wordInput","resultTitle","starsResult","resultScore","resultCompleted","resultMissed","resultAccuracy","resultCpm","resultStreak","resultTime","retryButton","nextTopicButton","menuButton","howModal","howClose","howAccept","pauseModal","resumeButton","quitButton"].map(id => [id, $(id)]));

  const defaults = { sound: true, tutorialSeen: false, last: { language: "ru", topic: "space", difficulty: "easy" }, records: { ru: { score: 0, accuracy: 0, cpm: 0 }, tr: { score: 0, accuracy: 0, cpm: 0 } } };
  let saved = loadSaved();
  let audioContext = null;
  let animationId = 0;
  let timerId = 0;
  let processingWord = false;
  let previousInput = "";
  let wordStartedAt = 0;
  let state = freshState();

  function freshState() {
    return { language: saved?.last?.language || "ru", topic: saved?.last?.topic || "space", difficulty: saved?.last?.difficulty || "easy", words: [], currentIndex: 0, currentWord: "", score: 0, energy: 5, streak: 0, bestStreak: 0, correctKeystrokes: 0, incorrectKeystrokes: 0, completedWords: 0, missedWords: 0, elapsedTime: 0, startedAt: 0, pauseStartedAt: 0, pausedTotal: 0, objectStartedAt: 0, paused: false, running: false };
  }

  function loadSaved() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...defaults, ...(parsed || {}), last: { ...defaults.last, ...(parsed?.last || {}) }, records: { ru: { ...defaults.records.ru, ...(parsed?.records?.ru || {}) }, tr: { ...defaults.records.tr, ...(parsed?.records?.tr || {}) } } };
    } catch { return structuredCloneSafe(defaults); }
  }
  function structuredCloneSafe(value) { return JSON.parse(JSON.stringify(value)); }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch {} }
  function showScreen(screen) { screens.forEach(s => s.classList.toggle("active", s === screen)); }
  function localeLower(value) { return value.toLocaleLowerCase(state.language === "tr" ? "tr-TR" : "ru-RU"); }
  function normalized(value) { return localeLower(value.trim()); }
  function shuffle(items) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function formatTime(seconds) { const s = Math.max(0, Math.floor(seconds)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
  function accuracy() { const total = state.correctKeystrokes + state.incorrectKeystrokes; return total ? Math.round(state.correctKeystrokes / total * 100) : 100; }
  function activeSeconds() { return state.running ? Math.max(0, (performance.now() - state.startedAt - state.pausedTotal - (state.paused ? performance.now() - state.pauseStartedAt : 0)) / 1000) : state.elapsedTime; }
  function cpm() { const seconds = activeSeconds(); return seconds > 0 ? Math.round(state.correctKeystrokes / seconds * 60) : 0; }

  function updateBestCard() {
    const best = Math.max(saved.records.ru.score, saved.records.tr.score);
    els.bestScore.textContent = best ? `${best.toLocaleString("ru-RU")} очков` : "Пока нет рекорда";
    els.soundButton.textContent = saved.sound ? "🔊" : "🔇";
    els.soundButton.setAttribute("aria-label", saved.sound ? "Выключить звук" : "Включить звук");
  }

  function initAudio() {
    if (!audioContext) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioContext = new AC(); }
    if (audioContext?.state === "suspended") audioContext.resume();
  }
  function sound(kind) {
    if (!saved.sound) return;
    initAudio(); if (!audioContext) return;
    const values = { click: [330,.05], correct: [660,.12], miss: [150,.16], finish: [520,.25], error: [210,.07] }[kind] || [330,.05];
    const osc = audioContext.createOscillator(), gain = audioContext.createGain();
    osc.type = kind === "miss" ? "sawtooth" : "sine"; osc.frequency.setValueAtTime(values[0], audioContext.currentTime);
    if (kind === "correct" || kind === "finish") osc.frequency.exponentialRampToValueAtTime(values[0] * 1.45, audioContext.currentTime + values[1]);
    gain.gain.setValueAtTime(.07, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + values[1]);
    osc.connect(gain).connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + values[1]);
  }

  function openSetup() { sound("click"); showScreen(els.setupScreen); syncChoices(); }
  function syncChoices() {
    document.querySelectorAll(".choice").forEach(button => {
      const selected = (button.classList.contains("language") && button.dataset.value === state.language) || (button.classList.contains("topic") && button.dataset.value === state.topic) || (button.classList.contains("difficulty") && button.dataset.value === state.difficulty);
      button.classList.toggle("selected", selected); button.setAttribute("aria-pressed", String(selected));
    });
    els.launchButton.disabled = !(state.language && state.topic && state.difficulty);
  }
  function selectChoice(button) {
    if (button.classList.contains("language")) state.language = button.dataset.value;
    if (button.classList.contains("topic")) state.topic = button.dataset.value;
    if (button.classList.contains("difficulty")) state.difficulty = button.dataset.value;
    saved.last = { language: state.language, topic: state.topic, difficulty: state.difficulty }; save(); syncChoices(); sound("click");
  }

  function buildMissionWords() {
    const cfg = CONFIG[state.difficulty], all = WORDS[state.language][state.topic];
    const preferred = all.filter(word => [...word].length >= cfg.min && [...word].length <= cfg.max);
    const rest = all.filter(word => !preferred.includes(word));
    return shuffle(preferred).concat(shuffle(rest)).slice(0, cfg.count);
  }
  function startMission() {
    cancelAnimationFrame(animationId); clearInterval(timerId);
    const selection = { language: state.language, topic: state.topic, difficulty: state.difficulty };
    state = { ...freshState(), ...selection };
    const cfg = CONFIG[state.difficulty]; state.words = buildMissionWords(); state.energy = cfg.energy; state.running = true; state.startedAt = performance.now();
    els.missionLabel.textContent = `${TOPIC_NAMES[state.topic]} · ${state.language === "ru" ? "Русский" : "Türkçe"}`;
    showScreen(els.gameScreen); updateHud(); nextWord();
    timerId = setInterval(updateHud, 250); sound("click");
  }
  function nextWord() {
    if (!state.running || state.energy <= 0 || state.currentIndex >= state.words.length) { finishMission(); return; }
    processingWord = false; previousInput = ""; state.currentWord = state.words[state.currentIndex]; state.objectStartedAt = performance.now(); wordStartedAt = performance.now();
    els.wordInput.value = ""; els.wordInput.disabled = false; renderWord(); updateHud();
    els.wordCapsule.style.top = "12%"; els.wordCapsule.style.transform = "translateX(-50%) scale(1)";
    requestAnimationFrame(() => els.wordInput.focus()); cancelAnimationFrame(animationId); animationId = requestAnimationFrame(animateObject);
  }
  function currentDuration() { const cfg = CONFIG[state.difficulty]; return cfg.duration * (state.difficulty === "hard" ? Math.max(.72, 1 - state.currentIndex * .012) : 1); }
  function animateObject(now) {
    if (!state.running || state.paused) return;
    const progress = Math.min(1, (now - state.objectStartedAt) / currentDuration());
    els.wordCapsule.style.top = `${12 + progress * 48}%`; els.wordCapsule.style.transform = `translateX(-50%) scale(${1 + progress * .28})`;
    if (progress >= 1) { missWord(); return; }
    animationId = requestAnimationFrame(animateObject);
  }
  function renderWord() {
    const input = normalized(els.wordInput.value), word = state.currentWord, inputChars = [...input], wordChars = [...word];
    els.targetWord.replaceChildren(...wordChars.map((char, index) => {
      const span = document.createElement("span"); span.textContent = char;
      if (index < inputChars.length) span.className = localeLower(inputChars[index]) === localeLower(char) ? "correct" : "wrong";
      else if (index === inputChars.length) span.className = "current";
      return span;
    }));
  }
  function handleInput() {
    if (!state.running || state.paused || processingWord) return;
    const raw = els.wordInput.value, current = normalized(raw), old = normalized(previousInput), target = normalized(state.currentWord);
    if ([...current].length > [...old].length) {
      const oldLength = [...old].length, chars = [...current], targetChars = [...target];
      for (let i = oldLength; i < chars.length; i++) {
        if (chars[i] === targetChars[i]) state.correctKeystrokes++; else { state.incorrectKeystrokes++; sound("error"); }
      }
    }
    previousInput = raw; renderWord(); updateHud();
    const prefixCorrect = target.startsWith(current);
    els.wordInput.classList.toggle("error", !prefixCorrect);
    if (!prefixCorrect) setTimeout(() => els.wordInput.classList.remove("error"), 260);
    if (current === target) completeWord();
  }
  function completeWord() {
    if (processingWord) return; processingWord = true; cancelAnimationFrame(animationId); els.wordInput.disabled = true;
    state.completedWords++; state.streak++; state.bestStreak = Math.max(state.bestStreak, state.streak);
    if (state.streak % 5 === 0) state.energy = Math.min(CONFIG[state.difficulty].energy, state.energy + 1);
    const speedRatio = Math.max(0, 1 - (performance.now() - wordStartedAt) / currentDuration());
    state.score += 100 + [...state.currentWord].length * 10 + Math.round(speedRatio * 100) + state.streak * 20;
    const messages = state.streak >= 5 ? `Серия ×${state.streak}!` : speedRatio > .72 ? "Суперскорость!" : ["Отлично!","Точно!","Здорово!"][Math.floor(Math.random()*3)];
    showToast(messages); els.flightZone.classList.add("success"); setTimeout(() => els.flightZone.classList.remove("success"), 400); sound("correct");
    state.currentIndex++; updateHud(); setTimeout(nextWord, 650);
  }
  function missWord() {
    if (processingWord) return; processingWord = true; state.missedWords++; state.energy--; state.streak = 0; state.currentIndex++; els.wordInput.disabled = true;
    showToast("Попробуй ещё!"); sound("miss"); updateHud(); setTimeout(nextWord, 750);
  }
  function showToast(text) { els.toast.textContent = text; els.toast.classList.remove("show"); void els.toast.offsetWidth; els.toast.classList.add("show"); }
  function updateHud() {
    els.scoreValue.textContent = state.score.toLocaleString("ru-RU"); els.progressValue.textContent = `${Math.min(state.currentIndex + 1, state.words.length || CONFIG[state.difficulty].count)} / ${state.words.length || CONFIG[state.difficulty].count}`;
    els.streakValue.textContent = `×${state.streak}`; els.timeValue.textContent = formatTime(activeSeconds()); els.accuracyValue.textContent = `${accuracy()}%`;
    els.energyPips.replaceChildren(...Array.from({ length: CONFIG[state.difficulty].energy }, (_, i) => { const pip = document.createElement("i"); pip.className = `energy-pip${i >= state.energy ? " empty" : ""}`; return pip; }));
  }

  function pauseGame(auto = false) {
    if (!state.running || state.paused) return; state.paused = true; state.pauseStartedAt = performance.now(); cancelAnimationFrame(animationId); els.wordInput.disabled = true; els.pauseModal.classList.remove("hidden");
    els.pauseModal.dataset.auto = String(auto); setTimeout(() => els.resumeButton.focus(), 0);
  }
  function resumeGame() {
    if (!state.running || !state.paused) return; const pauseLength = performance.now() - state.pauseStartedAt; state.pausedTotal += pauseLength; state.objectStartedAt += pauseLength; wordStartedAt += pauseLength; state.paused = false;
    els.pauseModal.classList.add("hidden"); els.wordInput.disabled = false; els.wordInput.focus(); animationId = requestAnimationFrame(animateObject); sound("click");
  }
  function quitMission() { state.running = false; state.paused = false; cancelAnimationFrame(animationId); clearInterval(timerId); els.pauseModal.classList.add("hidden"); showScreen(els.homeScreen); updateBestCard(); }
  function finishMission() {
    if (!state.running) return; state.elapsedTime = activeSeconds(); state.running = false; cancelAnimationFrame(animationId); clearInterval(timerId); els.wordInput.disabled = true;
    const finalAccuracy = accuracy(), finalCpm = cpm(); let stars = 1; if (finalAccuracy >= 85) stars = 2; if (finalAccuracy >= 95 && state.missedWords <= 1) stars = 3;
    const record = saved.records[state.language]; record.score = Math.max(record.score, state.score); record.accuracy = Math.max(record.accuracy, finalAccuracy); record.cpm = Math.max(record.cpm, finalCpm); saved.last = { language: state.language, topic: state.topic, difficulty: state.difficulty }; save();
    els.resultTitle.textContent = state.energy > 0 ? "Отличный полёт!" : "Миссия завершена!";
    els.starsResult.innerHTML = Array.from({length:3},(_,i)=>`<span class="${i < stars ? "" : "off"}">★</span>`).join(""); els.starsResult.setAttribute("aria-label", `${stars} из 3 звёзд`);
    els.resultScore.textContent = state.score.toLocaleString("ru-RU"); els.resultCompleted.textContent = state.completedWords; els.resultMissed.textContent = state.missedWords; els.resultAccuracy.textContent = `${finalAccuracy}%`; els.resultCpm.textContent = finalCpm; els.resultStreak.textContent = `×${state.bestStreak}`; els.resultTime.textContent = formatTime(state.elapsedTime);
    showScreen(els.resultScreen); updateBestCard(); sound("finish");
  }

  function openHow() { els.howModal.classList.remove("hidden"); setTimeout(() => els.howAccept.focus(), 0); sound("click"); }
  function closeHow(goSetup = false) { els.howModal.classList.add("hidden"); saved.tutorialSeen = true; save(); if (goSetup) openSetup(); else els.howButton.focus(); }

  document.querySelectorAll(".choice").forEach(button => button.addEventListener("click", () => selectChoice(button)));
  els.startButton.addEventListener("click", () => saved.tutorialSeen ? openSetup() : openHow());
  els.howButton.addEventListener("click", openHow); els.howClose.addEventListener("click", () => closeHow(false)); els.howAccept.addEventListener("click", () => closeHow(true));
  els.setupBack.addEventListener("click", () => { showScreen(els.homeScreen); sound("click"); }); els.launchButton.addEventListener("click", startMission);
  els.wordInput.addEventListener("input", handleInput); els.wordInput.addEventListener("paste", event => event.preventDefault()); els.wordInput.addEventListener("drop", event => event.preventDefault());
  els.wordInput.addEventListener("keydown", event => { if ((event.ctrlKey || event.metaKey) && ["v","x","z"].includes(event.key.toLowerCase())) event.preventDefault(); });
  els.pauseButton.addEventListener("click", () => pauseGame(false)); els.resumeButton.addEventListener("click", resumeGame); els.quitButton.addEventListener("click", quitMission);
  els.retryButton.addEventListener("click", startMission); els.nextTopicButton.addEventListener("click", () => { state.topic = TOPICS[(TOPICS.indexOf(state.topic) + 1) % TOPICS.length]; saved.last.topic = state.topic; save(); startMission(); }); els.menuButton.addEventListener("click", () => { showScreen(els.homeScreen); updateBestCard(); });
  els.soundButton.addEventListener("click", () => { saved.sound = !saved.sound; save(); updateBestCard(); if (saved.sound) sound("click"); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state.running && !state.paused) pauseGame(true); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") { if (!els.howModal.classList.contains("hidden")) closeHow(false); else if (state.running) state.paused ? resumeGame() : pauseGame(false); } });
  els.howModal.addEventListener("click", event => { if (event.target === els.howModal) closeHow(false); });

  updateBestCard(); syncChoices();
})();
