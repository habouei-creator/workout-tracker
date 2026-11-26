import { loadAll, saveAll } from "./db.js";
import { freshPlan, upgradePlan } from "./plan.js";
import { fetchCoach } from "./coach.js";
import { renderApp, buildCheckin, backupPayload } from "./render.js";
import * as L from "./logic.js";

const state = {
  screen: "home",
  today: "",
  plan: null,
  workouts: [],
  weighins: [],
  steps: {},
  settings: defaultSettings(),
  coach: { targets: { kcal_min: 2400, kcal_max: 2600, protein_g: 200 }, food_days: [], notes: [], exercise_overrides: [], plan_changes: [] },
  coachSource: "empty",
  foodDate: "",
  progressId: "lat-pulldown-cable",
  sheet: null,
  toast: "",
  ptr: "",
  weigh: { mode: "weight", weight: "", waist: "" },
  weighError: "",
  logError: "",
  planError: "",
  summaryId: null,
  detailId: null,
  planDayId: null,
  online: true,
  forceScrollTop: false,
  exerciseNotes: {},
  exerciseColors: {},
  editingNote: null,
  colorFor: null,
};

let lastScreen = "";
let writing = false;
let pendingSave = false;
let toastTimer = 0;

function defaultSettings() {
  return { topLiftId: null, topLiftName: null, coachNoteDraft: "", stepGoal: 10000, appliedHistorySeedIds: [] };
}

function todayISO() {
  try {
    const q = new URLSearchParams(location.search).get("as");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
    const stored = localStorage.getItem("wt-as-of");
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) return stored;
  } catch {
    /* ignore */
  }
  return L.isoDate(new Date());
}

function activeWorkout() {
  return state.workouts.find((w) => w.status === "active") || null;
}

function snapshot() {
  return {
    plan: state.plan,
    workouts: state.workouts,
    weighins: state.weighins,
    steps: state.steps,
    settings: state.settings,
  };
}

async function persist() {
  pendingSave = true;
  if (writing) return;
  writing = true;
  try {
    while (pendingSave) {
      pendingSave = false;
      await saveAll(snapshot());
    }
    scheduleSync();
  } catch (err) {
    console.error(err);
  } finally {
    writing = false;
  }
}

const SYNC_URL = "https://api.npoint.io/4d29135e499d5d37d4e1";
let syncTimer = 0;
let syncNeeded = false;

function coachSnapshot() {
  return {
    updatedAt: new Date().toISOString(),
    workouts: state.workouts || [],
    weighins: (state.weighins || []).map((row) => ({
      date: row.date,
      lb: row.lb != null && row.lb !== "" ? Number(row.lb) : null,
      unit: "lb",
      waistCm: row.waistCm != null && row.waistCm !== "" ? Number(row.waistCm) : null,
    })),
    notes: state.exerciseNotes || {},
    colors: state.exerciseColors || {},
  };
}

function scheduleSync() {
  syncNeeded = true;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushSync, 800);
}

function pushSync() {
  if (!syncNeeded) return;
  syncNeeded = false;
  const body = JSON.stringify(coachSnapshot());
  fetch(SYNC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body,
    keepalive: true,
  }).then((res) => {
    if (!res.ok) syncNeeded = true;
  }).catch(() => {
    syncNeeded = true;
  });
}

const NOTES_KEY = "wt-ex-notes";
const COLORS_KEY = "wt-ex-colors";

function readJsonMap(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeJsonMap(key, map) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* private mode */
  }
}

function captureScroll() {
  const sc = document.getElementById("scroll");
  return {
    box: sc ? sc.scrollTop : 0,
    win: window.scrollY || 0,
  };
}

function applyScroll(pos) {
  if (!pos) return;
  const sc = document.getElementById("scroll");
  if (sc) sc.scrollTop = pos.box;
  if ((window.scrollY || 0) !== pos.win) window.scrollTo(0, pos.win);
}

let scrollPin = null;
let scrollPinUntil = 0;
let scrollPinFrame = 0;

function holdScroll(pos) {
  applyScroll(pos);
  requestAnimationFrame(() => applyScroll(pos));
  setTimeout(() => applyScroll(pos), 0);
  setTimeout(() => applyScroll(pos), 60);
}

function pinScroll(ms = 500, recapture = false) {
  if (recapture || !scrollPin || Date.now() > scrollPinUntil) scrollPin = captureScroll();
  scrollPinUntil = Date.now() + ms;
  holdScroll(scrollPin);
  if (!scrollPinFrame) {
    const step = () => {
      if (!scrollPin || Date.now() > scrollPinUntil) {
        scrollPinFrame = 0;
        return;
      }
      applyScroll(scrollPin);
      scrollPinFrame = requestAnimationFrame(step);
    };
    scrollPinFrame = requestAnimationFrame(step);
  }
}

function keepPinnedScroll(event) {
  if (!scrollPin || Date.now() > scrollPinUntil) return;
  const sc = document.getElementById("scroll");
  if (event.target === sc && sc.scrollTop !== scrollPin.box) sc.scrollTop = scrollPin.box;
  if (event.target === document && (window.scrollY || 0) !== scrollPin.win) window.scrollTo(0, scrollPin.win);
}

function isSetField(el) {
  if (!(el instanceof HTMLInputElement)) return false;
  const action = el.dataset.action;
  return action === "set-kg" || action === "set-reps" || action === "hist-kg" || action === "hist-reps";
}

function selectLogField(el) {
  if (!isSetField(el)) return;
  const apply = () => {
    const len = el.value.length;
    try {
      el.setSelectionRange(0, len);
    } catch {
      /* some input types reject a range */
    }
    pinScroll();
  };
  setTimeout(apply, 0);
  setTimeout(apply, 40);
}

function saveExerciseNote(name, value, trim) {
  const key = L.canonicalName(name);
  const notes = { ...(state.exerciseNotes || {}) };
  const text = trim ? String(value || "").trim() : String(value || "");
  if (text) notes[key] = text;
  else delete notes[key];
  state.exerciseNotes = notes;
  writeJsonMap(NOTES_KEY, notes);
  scheduleSync();
}

function saveExerciseColor(name, color) {
  const key = L.canonicalName(name);
  const colors = { ...(state.exerciseColors || {}) };
  if (color) colors[key] = color;
  else delete colors[key];
  state.exerciseColors = colors;
  writeJsonMap(COLORS_KEY, colors);
  scheduleSync();
}

let saveTimer = 0;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 200);
}

function render() {
  const keep = state.screen === lastScreen && !state.forceScrollTop;
  const pos = keep ? captureScroll() : { box: 0, win: 0 };
  state.forceScrollTop = false;
  lastScreen = state.screen;
  document.getElementById("app").innerHTML = renderApp(state);
  holdScroll(pos);
}

function toast(message) {
  state.toast = message;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    state.toast = "";
    render();
  }, 1700);
}

function sameOrder(a, b) {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

function syncPlanFromNames(dayId, names) {
  const day = state.plan.days.find((item) => item.id === dayId);
  if (!day) return;
  const pool = [...day.exercises];
  const next = [];
  for (const name of names) {
    const index = pool.findIndex((item) => item.name === name);
    if (index >= 0) next.push(pool.splice(index, 1)[0]);
  }
  day.exercises = next.concat(pool);
}

function syncWorkoutFromPlan(dayId) {
  const w = activeWorkout();
  const day = state.plan.days.find((item) => item.id === dayId);
  if (!w || w.dayId !== dayId || !day) return;
  const current = w.exercises[w.logIndex || 0];
  const pool = [...w.exercises];
  const ordered = [];
  for (const planned of day.exercises) {
    const index = pool.findIndex((item) => item.name === planned.name || item.exerciseId === planned.id);
    if (index >= 0) ordered.push(pool.splice(index, 1)[0]);
  }
  w.exercises = ordered.concat(pool);
  if (current) {
    const index = w.exercises.indexOf(current);
    if (index >= 0) w.logIndex = index;
  }
}

function nudgeExercise(source, dayId, from, steps) {
  if (!steps) return;
  if (source === "workout") {
    const w = activeWorkout();
    if (!w || w.dayId !== dayId) return;
    const next = L.moveInList(w.exercises, from, steps);
    if (sameOrder(next, w.exercises)) return;
    const current = w.exercises[w.logIndex || 0];
    w.exercises = next;
    if (current) {
      const index = w.exercises.indexOf(current);
      if (index >= 0) w.logIndex = index;
    }
    syncPlanFromNames(dayId, w.exercises.map((item) => item.name));
  } else {
    const day = state.plan.days.find((item) => item.id === dayId);
    if (!day) return;
    const next = L.moveInList(day.exercises, from, steps);
    if (sameOrder(next, day.exercises)) return;
    day.exercises = next;
    syncWorkoutFromPlan(dayId);
  }
  state.forceScrollTop = false;
  persist();
  render();
}

function bindDrag() {
  let drag = null;
  document.body.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest("[data-drag]");
    if (!handle) return;
    const row = handle.closest("[data-index]");
    if (!row) return;
    drag = {
      source: handle.dataset.drag,
      dayId: handle.dataset.id,
      from: Number(row.dataset.index),
      startY: event.clientY,
      row,
      dy: 0,
    };
    row.classList.add("dragging");
    event.preventDefault();
  });
  document.body.addEventListener("pointermove", (event) => {
    if (!drag) return;
    drag.dy = event.clientY - drag.startY;
    drag.row.style.transform = `translateY(${drag.dy}px)`;
  });
  const finishDrag = () => {
    if (!drag) return;
    const height = drag.row.getBoundingClientRect().height || 64;
    const steps = Math.round(drag.dy / height);
    drag.row.classList.remove("dragging");
    drag.row.style.transform = "";
    const info = drag;
    drag = null;
    if (steps) nudgeExercise(info.source, info.dayId, info.from, steps);
  };
  document.body.addEventListener("pointerup", finishDrag);
  document.body.addEventListener("pointercancel", finishDrag);
}

function recomputePRs() {
  const done = state.workouts
    .filter((w) => w.status === "done")
    .sort((a, b) => String(a.finishedAt || a.date).localeCompare(String(b.finishedAt || b.date)));
  const prior = [];
  for (const w of done) {
    w.prs = L.detectPRs(w, prior);
    w.advice = L.adviceForWorkout(w, prior);
    prior.push(w);
  }
}

function applyHistorySeed() {
  const seed = state.coach?.history_seed || [];
  const current = state.settings.appliedHistorySeedIds || [];
  const merged = L.mergeHistorySeed(state.workouts, seed, current, state.plan);
  state.workouts = merged.workouts;
  state.settings.appliedHistorySeedIds = merged.appliedIds;
  if (merged.added.length) {
    recomputePRs();
    persist();
  }
}

async function refreshCoach() {
  const result = await fetchCoach();
  state.coach = result.data;
  state.coachSource = result.source;
  if (state.plan && L.mergePlanChanges(state.plan, state.coach.plan_changes)) persist();
  applyHistorySeed();
}

function syncLogInputs() {
  document.querySelectorAll("[data-action='set-kg'], [data-action='set-reps']").forEach((el) => {
    writeSet(el, el.dataset.action === "set-kg");
  });
}

function writeSet(el, isKg) {
  const w = activeWorkout();
  if (!w) return;
  const set = w.exercises[Number(el.dataset.i)]?.sets?.[Number(el.dataset.s)];
  if (!set) return;
  const raw = String(el.value || "").replace(",", ".").trim();
  if (raw === "") {
    if (isKg) set.kg = null;
    else set.reps = null;
    return;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return;
  if (isKg) set.kg = n;
  else set.reps = Math.round(n);
}

function completeSet(exIndex, setIndex) {
  syncLogInputs();
  const w = activeWorkout();
  if (!w) return;
  const ex = w.exercises[exIndex];
  const set = ex?.sets?.[setIndex];
  if (!set) return;
  const reps = Number(set.reps);
  if (!reps || reps < 1) {
    state.logError = "Enter the reps before you log the set.";
    render();
    return;
  }
  set.reps = reps;
  set.kg = set.kg == null || Number.isNaN(Number(set.kg)) ? 0 : Number(set.kg);
  set.completed = true;
  state.logError = "";
  const action = L.afterSetAction(w.exercises, exIndex);
  if (action.type === "goto" && action.index !== exIndex) {
    w.logIndex = action.index;
    state.forceScrollTop = true;
  }
  persist();
  render();
}

function startWorkout(dayId) {
  if (!dayId) return;
  const active = activeWorkout();
  if (active && active.dayId !== dayId) {
    state.sheet = {
      type: "confirm",
      title: "Replace the workout in progress?",
      body: `${active.dayName} is still open. Starting another one discards it.`,
      confirmLabel: "Discard and start",
      confirmAction: "discard-start",
      dayId,
    };
    render();
    return;
  }
  if (active && active.dayId === dayId) {
    state.sheet = null;
    state.screen = "log";
    state.forceScrollTop = true;
    render();
    return;
  }
  const workout = L.createWorkout(state.plan, state.workouts, dayId, state.today, state.coach.exercise_overrides);
  if (!workout) return;
  state.workouts.push(workout);
  state.sheet = null;
  state.logError = "";
  state.screen = "log";
  state.forceScrollTop = true;
  persist();
  render();
}

function finishWorkout() {
  const w = activeWorkout();
  if (!w) return;
  syncLogInputs();
  const prior = state.workouts.filter((x) => x.status === "done" && x.id !== w.id);
  const done = L.finishWorkout(w, prior);
  const idx = state.workouts.findIndex((x) => x.id === w.id);
  state.workouts[idx] = done;
  state.summaryId = done.id;
  state.screen = "summary";
  state.sheet = null;
  state.forceScrollTop = true;
  persist();
  render();
}

function openWeigh() {
  const row = state.weighins.find((w) => w.date === state.today);
  state.weigh = {
    mode: "weight",
    weight: row && row.lb != null && row.lb !== "" ? String(row.lb) : "",
    waist: row && row.waistCm != null && row.waistCm !== "" ? String(row.waistCm) : "",
  };
  state.weighError = "";
  state.screen = "weigh";
  state.forceScrollTop = true;
  render();
}

function padKey(key) {
  const field = state.weigh.mode === "waist" ? "waist" : "weight";
  let v = state.weigh[field] || "";
  if (key === "bksp") v = v.slice(0, -1);
  else if (key === ".") {
    if (!v.includes(".")) v = `${v || "0"}.`;
  } else if (/^\d$/.test(key)) {
    if (v === "0") v = key;
    else v += key;
  }
  if (v.includes(".")) {
    const [a, b = ""] = v.split(".");
    v = `${a.slice(0, 3)}.${b.slice(0, 1)}`;
  } else {
    v = v.slice(0, 3);
  }
  state.weigh[field] = v;
  state.weighError = "";
  render();
}

function saveWeigh() {
  const lb = Math.round(Number(state.weigh.weight) * 10) / 10;
  if (!lb || lb < 70 || lb > 500) {
    state.weighError = "Enter a weight between 70 and 500 lb.";
    render();
    return;
  }
  const sunday = new Date(`${state.today}T12:00:00`).getDay() === 0;
  let waistCm = null;
  if (sunday && state.weigh.waist) {
    waistCm = Number(state.weigh.waist);
    if (!waistCm || waistCm < 40 || waistCm > 200) {
      state.weighError = "Enter a waist between 40 and 200 cm, or leave it blank.";
      render();
      return;
    }
  }
  let row = state.weighins.find((w) => w.date === state.today);
  if (!row) {
    row = { date: state.today, lb, unit: "lb", waistCm };
    state.weighins.push(row);
  } else {
    row.lb = lb;
    row.unit = "lb";
    delete row.kg;
    if (waistCm != null) row.waistCm = waistCm;
  }
  state.weighins.sort((a, b) => a.date.localeCompare(b.date));
  state.screen = "home";
  state.weighError = "";
  state.forceScrollTop = true;
  persist();
  toast("Weigh-in saved");
}

function applySwap(name) {
  if (L.isBannedExercise(name)) {
    state.planError = L.BAN_REASON;
    render();
    return;
  }
  const w = activeWorkout();
  if (!w) return;
  const i = w.logIndex || 0;
  const ex = w.exercises[i];
  const completed = ex.sets.some((s) => s.completed);
  if (completed) {
    const last = L.lastPerformance(state.workouts, name, w.id);
    const neu = {
      exerciseId: L.slug(name) || L.uid(),
      name,
      superset: null,
      slot: null,
      targetSets: ex.targetSets,
      repsMin: ex.repsMin,
      repsMax: ex.repsMax,
      rir: ex.rir,
      sets: L.prefillSets(ex.targetSets || ex.sets.length, last ? last.sets : null),
    };
    w.exercises.splice(i + 1, 0, neu);
    w.logIndex = i + 1;
  } else {
    ex.name = name;
    ex.exerciseId = L.slug(name) || ex.exerciseId;
    const last = L.lastPerformance(state.workouts, name, w.id);
    ex.sets = L.prefillSets(ex.sets.length, last ? last.sets : null);
  }
  state.sheet = null;
  state.planError = "";
  state.forceScrollTop = true;
  persist();
  render();
}

function applyBind(path, value) {
  const parts = path.split("|");
  if (parts[0] === "settings") {
    if (parts[1] === "stepGoal") state.settings.stepGoal = Math.round(Number(value) || 0);
    else state.settings[parts[1]] = value;
    if (parts[1] === "coachNoteDraft") {
      const mono = document.querySelector(".mono");
      if (mono) mono.textContent = buildCheckin(state);
    }
    return;
  }
  if (parts[0] === "plan") {
    if (parts[1] === "weeks") state.plan.weeks = Math.max(1, Math.round(Number(value) || 1));
    else state.plan[parts[1]] = value.trim();
    return;
  }
  if (parts[0] === "phase") {
    const phase = state.plan.phases[Number(parts[1])];
    if (phase) phase[parts[2]] = value;
    return;
  }
  if (parts[0] === "schedule") {
    state.plan.schedule = state.plan.schedule || {};
    state.plan.schedule[parts[1]] = value || null;
    return;
  }
  if (parts[0] === "day") {
    const day = state.plan.days.find((d) => d.id === parts[1]);
    if (day) day[parts[2]] = value;
    return;
  }
  if (parts[0] === "ex") {
    const day = state.plan.days.find((d) => d.id === parts[1]);
    const ex = day?.exercises?.[Number(parts[2])];
    if (!ex) return;
    const field = parts[3];
    if (field === "name") {
      if (L.isBannedExercise(value)) {
        state.planError = L.BAN_REASON;
        const err = document.querySelector(".err");
        if (err) err.textContent = L.BAN_REASON;
        return;
      }
      ex.name = value;
      const id = L.slug(value);
      if (id) ex.id = id;
      state.planError = "";
      return;
    }
    if (field === "superset") {
      const letter = value.trim().toUpperCase().slice(0, 1);
      ex.superset = letter || null;
      return;
    }
    if (["sets", "repsMin", "repsMax"].includes(field)) {
      ex[field] = Math.max(0, Math.round(Number(value) || 0));
    }
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

async function exportBackup() {
  const payload = backupPayload(state);
  const json = JSON.stringify(payload, null, 2);
  const name = `workout-tracker-${state.today}.json`;
  const file = new File([json], name, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Workout Tracker backup" });
      toast("Backup shared");
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  const copied = await copyText(json);
  toast(copied ? "Backup downloaded and copied" : "Backup downloaded");
}

async function doImport() {
  try {
    let text = document.getElementById("import-text")?.value.trim() || "";
    const file = document.getElementById("import-file")?.files?.[0];
    if (file) text = await file.text();
    if (!text) {
      state.planError = "Choose a file or paste a backup first.";
      render();
      return;
    }
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.workouts) || !Array.isArray(data.weighins)) {
      state.planError = "That file is not a Workout Tracker backup.";
      render();
      return;
    }
    if (data.plan && data.plan.days && data.plan.phases) state.plan = data.plan;
    state.workouts = data.workouts;
    state.weighins = L.migrateWeighIns(data.weighins).weighins;
    state.steps = data.steps && typeof data.steps === "object" ? data.steps : {};
    state.settings = { ...defaultSettings(), ...(data.settings || {}) };
    state.sheet = null;
    state.planError = "";
    persist();
    toast("Backup imported");
  } catch {
    state.planError = "Could not read that JSON.";
    render();
  }
}

function tick() {
  const w = activeWorkout();
  const elapsed = document.getElementById("elapsed");
  if (elapsed && w?.startedAt) {
    elapsed.textContent = L.formatElapsed(Date.now() - new Date(w.startedAt).getTime());
  }
}

function goTab(tab) {
  state.sheet = null;
  state.planError = "";
  state.toast = "";
  if (tab === "home") state.screen = "home";
  else if (tab === "train") state.screen = "train";
  else if (tab === "food") {
    state.screen = "food";
    if (!state.foodDate) state.foodDate = state.today;
  } else if (tab === "coach") state.screen = "coach";
  state.forceScrollTop = true;
  render();
}

function onClick(event) {
  const el = event.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  if (!action || action === "stop") return;
  if (action === "close-sheet") {
    state.sheet = null;
    state.planError = "";
    render();
    return;
  }
  handle(action, el);
}

function onInput(event) {
  const el = event.target;
  if (!(el instanceof HTMLElement)) return;
  if (el.dataset.bind) {
    applyBind(el.dataset.bind, el.value);
    saveSoon();
    return;
  }
  if (el.dataset.action === "set-kg" || el.dataset.action === "set-reps") {
    writeSet(el, el.dataset.action === "set-kg");
    saveSoon();
    pinScroll();
    return;
  }
  if (el.dataset.action === "ex-note") {
    saveExerciseNote(el.dataset.name, el.value, false);
    pinScroll();
    return;
  }
  if (el.dataset.action === "hist-kg" || el.dataset.action === "hist-reps") {
    const w = state.workouts.find((x) => x.id === el.dataset.id);
    const set = w?.exercises?.[Number(el.dataset.i)]?.sets?.[Number(el.dataset.s)];
    if (!set) return;
    const raw = String(el.value || "").replace(",", ".").trim();
    const n = raw === "" ? null : Number(raw);
    if (el.dataset.action === "hist-kg") set.kg = n == null || Number.isNaN(n) ? null : n;
    else set.reps = n == null || Number.isNaN(n) ? null : Math.round(n);
    if (set.reps) set.completed = true;
    recomputePRs();
    saveSoon();
  }
}

function onKey(event) {
  if (state.screen !== "weigh") return;
  const tag = event.target && event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (/^\d$/.test(event.key)) padKey(event.key);
  else if (event.key === "." || event.key === ",") padKey(".");
  else if (event.key === "Backspace") padKey("bksp");
  else if (event.key === "Enter") saveWeigh();
}

function handle(action, el) {
  const w = activeWorkout();
  if (action === "set-kg" || action === "set-reps" || action === "hist-kg" || action === "hist-reps" || action === "ex-note") return;
  if (action === "edit-note") {
    state.editingNote = L.canonicalName(el.dataset.name || "");
    state.colorFor = null;
    const pos = captureScroll();
    render();
    const ta = document.querySelector("textarea[data-action='ex-note']");
    if (ta) {
      ta.focus({ preventScroll: true });
      const len = ta.value.length;
      try { ta.setSelectionRange(len, len); } catch { /* ignore */ }
    }
    holdScroll(pos);
    return;
  }
  if (action === "pick-color") {
    const key = L.canonicalName(el.dataset.name || "");
    state.colorFor = state.colorFor === key ? null : key;
    const pos = captureScroll();
    render();
    holdScroll(pos);
    return;
  }
  if (action === "set-color") {
    saveExerciseColor(el.dataset.name || "", el.dataset.color || "");
    state.colorFor = null;
    const pos = captureScroll();
    render();
    holdScroll(pos);
    return;
  }
  if (action === "tab") return goTab(el.dataset.tab);
  if (action === "train-tab") {
    const tab = el.dataset.tab;
    state.screen = tab === "progress" ? "progress" : tab === "history" ? "history" : "train";
    state.sheet = null;
    state.forceScrollTop = true;
    render();
    return;
  }
  if (action === "settings") {
    state.screen = "settings";
    state.sheet = null;
    state.forceScrollTop = true;
    render();
    return;
  }
  if (action === "weigh") return openWeigh();
  if (action === "start") return startWorkout(el.dataset.day);
  if (action === "discard-start") {
    const dayId = state.sheet?.dayId;
    state.workouts = state.workouts.filter((x) => x.status !== "active");
    state.sheet = null;
    persist();
    startWorkout(dayId);
    return;
  }
  if (action === "resume" || action === "back-today") {
    state.screen = action === "resume" ? "log" : "train";
    state.forceScrollTop = true;
    render();
    return;
  }
  if (action === "open-ex") {
    if (!w) return;
    w.logIndex = Number(el.dataset.i) || 0;
    state.screen = "log";
    state.forceScrollTop = true;
    persist();
    render();
    return;
  }
  if (action === "log-next") {
    if (!w) return;
    const i = w.logIndex || 0;
    const open = L.firstOpenSet(w.exercises[i]);
    if (open >= 0) completeSet(i, open);
    return;
  }
  if (action === "toggle-set") {
    if (!w) return;
    const i = Number(el.dataset.i);
    const s = Number(el.dataset.s);
    const set = w.exercises[i]?.sets?.[s];
    if (!set) return;
    if (set.completed) {
      set.completed = false;
      state.logError = "";
      persist();
      render();
    } else completeSet(i, s);
    return;
  }
  if (action === "next-ex") {
    if (!w) return;
    const i = w.logIndex || 0;
    let n = w.exercises.findIndex((ex, idx) => idx > i && L.firstOpenSet(ex) >= 0);
    if (n < 0) n = w.exercises.findIndex((ex) => L.firstOpenSet(ex) >= 0);
    if (n >= 0) w.logIndex = n;
    state.forceScrollTop = true;
    persist();
    render();
    return;
  }
  if (action === "prev-ex") {
    if (!w || !w.logIndex) return;
    w.logIndex -= 1;
    state.forceScrollTop = true;
    persist();
    render();
    return;
  }
  if (action === "add-set") {
    if (!w) return;
    const ex = w.exercises[w.logIndex || 0];
    const last = ex.sets[ex.sets.length - 1];
    ex.sets.push({
      kg: last ? last.kg : null,
      reps: last ? last.reps : null,
      completed: false,
      prevKg: last ? last.prevKg : null,
      prevReps: last ? last.prevReps : null,
    });
    persist();
    render();
    return;
  }
  if (action === "remove-set") {
    if (!w) return;
    const ex = w.exercises[w.logIndex || 0];
    if (ex.sets.length < 2) return;
    const last = ex.sets[ex.sets.length - 1];
    if (last.completed) {
      state.sheet = {
        type: "confirm",
        title: "Remove the last set?",
        body: "That set is already logged. Removing it drops it from this workout.",
        confirmLabel: "Remove set",
        confirmAction: "remove-set-now",
      };
      render();
      return;
    }
    ex.sets.pop();
    persist();
    render();
    return;
  }
  if (action === "remove-set-now") {
    if (!w) return;
    const ex = w.exercises[w.logIndex || 0];
    if (ex.sets.length > 1) ex.sets.pop();
    state.sheet = null;
    persist();
    render();
    return;
  }
  if (action === "swap") {
    state.planError = "";
    state.sheet = { type: "swap" };
    render();
    return;
  }
  if (action === "do-swap") return applySwap(el.dataset.name || "");
  if (action === "swap-custom") {
    const name = document.getElementById("swap-custom")?.value.trim();
    if (!name) {
      state.planError = "Type a name for the exercise.";
      render();
      return;
    }
    return applySwap(name);
  }
  if (action === "ask-finish") {
    if (!w) return;
    syncLogInputs();
    const open = w.exercises.reduce((n, ex) => n + ex.sets.filter((s) => !s.completed).length, 0);
    if (open > 0) {
      state.sheet = {
        type: "confirm",
        title: "Finish now?",
        body: `${open} sets are still open. Missed sets count when the app suggests the next load.`,
        confirmLabel: "Finish workout",
        confirmAction: "finish-now",
      };
      render();
      return;
    }
    finishWorkout();
    return;
  }
  if (action === "finish-now") return finishWorkout();
  if (action === "pick-day") {
    state.sheet = { type: "days" };
    render();
    return;
  }
  if (action === "open-summary") {
    state.summaryId = el.dataset.id;
    state.screen = "summary";
    state.forceScrollTop = true;
    render();
    return;
  }
  if (action === "pick-progress") {
    state.progressId = el.dataset.id;
    state.screen = "progress";
    render();
    return;
  }
  if (action === "open-detail") {
    state.detailId = el.dataset.id;
    state.screen = "detail";
    state.forceScrollTop = true;
    render();
    return;
  }
  if (action === "delete-workout") {
    state.sheet = {
      type: "confirm",
      title: "Delete this workout?",
      body: "This removes it from this phone. Export a backup first if you might want it back.",
      confirmLabel: "Delete",
      confirmAction: "delete-workout-now",
      workoutId: el.dataset.id,
    };
    render();
    return;
  }
  if (action === "delete-workout-now") {
    const id = state.sheet?.workoutId;
    state.workouts = state.workouts.filter((x) => x.id !== id);
    recomputePRs();
    state.sheet = null;
    state.screen = "history";
    persist();
    toast("Workout deleted");
    return;
  }
  if (action === "hist-toggle") {
    const workout = state.workouts.find((x) => x.id === el.dataset.id);
    const set = workout?.exercises?.[Number(el.dataset.i)]?.sets?.[Number(el.dataset.s)];
    if (!set) return;
    set.completed = !set.completed;
    recomputePRs();
    persist();
    render();
    return;
  }
  if (action === "food-prev") {
    state.foodDate = L.addDays(state.foodDate || state.today, -1);
    render();
    return;
  }
  if (action === "food-next") {
    const next = L.addDays(state.foodDate || state.today, 1);
    if (next > state.today) return;
    state.foodDate = next;
    render();
    return;
  }
  if (action === "copy-checkin") {
    copyText(buildCheckin(state)).then((ok) => toast(ok ? "Copied. Paste it into chat." : "Could not copy. Select the preview and copy it."));
    return;
  }
  if (action === "pad") return padKey(el.dataset.key || "");
  if (action === "save-weigh") return saveWeigh();
  if (action === "focus-waist") {
    state.weigh.mode = "waist";
    render();
    return;
  }
  if (action === "focus-weight") {
    state.weigh.mode = "weight";
    render();
    return;
  }
  if (action === "edit-steps") {
    state.sheet = { type: "steps" };
    render();
    return;
  }
  if (action === "save-steps") {
    const raw = document.getElementById("steps-input")?.value.trim() || "";
    const n = Math.round(Number(raw));
    if (!raw || !Number.isFinite(n) || n < 0 || n > 200000) {
      toast("Enter a step count");
      return;
    }
    state.steps[state.today] = n;
    state.sheet = null;
    persist();
    toast("Steps saved");
    return;
  }
  if (action === "export") {
    exportBackup();
    return;
  }
  if (action === "import-open") {
    state.planError = "";
    state.sheet = { type: "import" };
    render();
    return;
  }
  if (action === "do-import") {
    doImport();
    return;
  }
  if (action === "open-plan") {
    state.screen = "plan";
    state.sheet = null;
    state.forceScrollTop = true;
    render();
    return;
  }
  if (action === "open-plan-day") {
    state.planDayId = el.dataset.id;
    state.planError = "";
    state.screen = "plan-day";
    state.forceScrollTop = true;
    render();
    return;
  }
  if (action === "add-phase") {
    const last = state.plan.phases[state.plan.phases.length - 1];
    const start = L.addDays(last.end, 1);
    state.plan.phases.push({
      id: `phase-${start}`,
      name: "New phase",
      start,
      end: L.addDays(start, 13),
      setMod: "as-written",
      rir: "2",
      conditioning: "",
    });
    persist();
    render();
    return;
  }
  if (action === "continue-phase") {
    L.continuePhase(state.plan, state.today);
    persist();
    toast("Added 4 weeks");
    return;
  }
  if (action === "delete-phase") {
    const i = Number(el.dataset.i);
    if (state.plan.phases.length > 1) state.plan.phases.splice(i, 1);
    persist();
    render();
    return;
  }
  if (action === "add-ex") {
    const day = state.plan.days.find((d) => d.id === el.dataset.id);
    const name = document.getElementById("new-ex")?.value.trim();
    if (!day || !name) return;
    if (L.isBannedExercise(name)) {
      state.planError = L.BAN_REASON;
      render();
      return;
    }
    day.exercises.push({
      id: L.slug(name) || L.uid(),
      name,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      superset: null,
    });
    state.planError = "";
    persist();
    render();
    return;
  }
  if (action === "delete-ex") {
    const day = state.plan.days.find((d) => d.id === el.dataset.id);
    if (!day) return;
    day.exercises.splice(Number(el.dataset.i), 1);
    persist();
    render();
    return;
  }
  if (action === "nudge") {
    nudgeExercise(el.dataset.source, el.dataset.id, Number(el.dataset.i), Number(el.dataset.dir));
    return;
  }
  if (action === "move-ex") {
    const day = state.plan.days.find((d) => d.id === el.dataset.id);
    if (!day) return;
    const i = Number(el.dataset.i);
    const dir = Number(el.dataset.dir);
    const j = i + dir;
    if (j < 0 || j >= day.exercises.length) return;
    const [item] = day.exercises.splice(i, 1);
    day.exercises.splice(j, 0, item);
    persist();
    render();
    return;
  }
  if (action === "reset-plan") {
    state.sheet = {
      type: "confirm",
      title: "Reset the training plan?",
      body: "This puts back the original 8-week block. Workouts and weigh-ins already on this phone stay.",
      confirmLabel: "Reset plan",
      confirmAction: "reset-plan-now",
    };
    render();
    return;
  }
  if (action === "reset-plan-now") {
    state.plan = freshPlan();
    state.sheet = null;
    persist();
    toast("Plan reset");
    return;
  }
  if (action === "pick-lift") {
    state.sheet = { type: "lift" };
    render();
    return;
  }
  if (action === "set-lift") {
    state.settings.topLiftId = el.dataset.id;
    state.settings.topLiftName = el.dataset.name;
    state.sheet = null;
    persist();
    if (state.screen !== "home" && state.screen !== "settings") state.screen = "home";
    toast("Lift saved");
    return;
  }
}

function bindPull() {
  let startY = 0;
  let pulling = false;
  let dy = 0;
  document.body.addEventListener(
    "touchstart",
    (event) => {
      const sc = document.getElementById("scroll");
      if (!sc || sc.scrollTop > 2) {
        pulling = false;
        return;
      }
      startY = event.touches[0].clientY;
      pulling = true;
      dy = 0;
    },
    { passive: true }
  );
  document.body.addEventListener(
    "touchmove",
    (event) => {
      if (!pulling) return;
      dy = event.touches[0].clientY - startY;
      const el = document.getElementById("ptr");
      if (el && dy > 48) el.textContent = dy > 84 ? "Release to refresh" : "Pull to refresh";
    },
    { passive: true }
  );
  document.body.addEventListener("touchend", async () => {
    const should = pulling && dy > 84;
    pulling = false;
    dy = 0;
    const el = document.getElementById("ptr");
    if (!should) {
      if (el) el.textContent = "";
      return;
    }
    if (el) el.textContent = "Refreshing";
    await refreshCoach();
    state.ptr = "";
    toast(state.coachSource === "network" ? "Coach file updated" : "Showing the saved coach file");
  });
}

function showBootError(message) {
  document.getElementById("app").innerHTML = `<div class="shell"><div class="scroll"><h1>Workout Tracker</h1><p class="bodycopy" style="margin-top:12px">${message}</p></div></div>`;
}

async function init() {
  state.today = todayISO();
  state.foodDate = state.today;
  state.online = navigator.onLine;
  let data;
  try {
    data = await loadAll();
  } catch {
    showBootError("This browser blocked on-phone storage. Open the app in a normal Safari tab, not private mode, then add it to the Home Screen again.");
    return;
  }
  const storedPlan = data.plan && data.plan.days && data.plan.phases ? data.plan : null;
  state.plan = upgradePlan(storedPlan);
  if (!state.plan.schedule) state.plan.schedule = freshPlan().schedule;
  state.workouts = data.workouts || [];
  const migrated = L.migrateWeighIns(data.weighins || []);
  state.weighins = migrated.weighins;
  state.steps = data.steps || {};
  state.settings = { ...defaultSettings(), ...(data.settings || {}) };
  state.exerciseNotes = readJsonMap(NOTES_KEY);
  state.exerciseColors = readJsonMap(COLORS_KEY);
  if (!storedPlan || (storedPlan.seedVersion || 1) < state.plan.seedVersion || migrated.changed) persist();
  await refreshCoach();
  render();
  document.addEventListener("scroll", keepPinnedScroll, true);
  document.body.addEventListener("pointerdown", (event) => {
    const el = event.target;
    if (isSetField(el) || (el instanceof HTMLTextAreaElement && el.dataset.action === "ex-note")) pinScroll(800, true);
  }, true);
  document.body.addEventListener("click", onClick);
  document.body.addEventListener("focusin", (event) => {
    const el = event.target;
    if (isSetField(el)) {
      pinScroll();
      selectLogField(el);
      return;
    }
    if (el instanceof HTMLTextAreaElement && el.dataset.action === "ex-note") pinScroll();
  });
  document.body.addEventListener("click", (event) => {
    if (!isSetField(event.target)) return;
    const pos = captureScroll();
    selectLogField(event.target);
    holdScroll(pos);
  });
  document.body.addEventListener("focusout", (event) => {
    const el = event.target;
    if (!(el instanceof HTMLTextAreaElement) || el.dataset.action !== "ex-note") return;
    saveExerciseNote(el.dataset.name, el.value, true);
    const key = L.canonicalName(el.dataset.name || "");
    setTimeout(() => {
      if (state.editingNote !== key) return;
      const active = document.activeElement;
      if (active instanceof HTMLTextAreaElement && active.dataset.action === "ex-note") return;
      state.editingNote = null;
      const pos = captureScroll();
      render();
      holdScroll(pos);
    }, 180);
  });
  document.body.addEventListener("input", onInput);
  document.body.addEventListener("change", onInput);
  document.body.addEventListener("keydown", onKey);
  bindDrag();
  bindPull();
  window.addEventListener("online", () => {
    state.online = true;
    refreshCoach().then(render);
  });
  window.addEventListener("offline", () => {
    state.online = false;
    render();
  });
  window.addEventListener("pagehide", () => {
    persist();
    syncNeeded = true;
    clearTimeout(syncTimer);
    pushSync();
  });
  setInterval(tick, 250);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  window.__WT = state;
}

init();
