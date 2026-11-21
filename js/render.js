import { SAFE_SWAPS, WEEKDAYS, SET_MODS } from "./plan.js";
import {
  addDays,
  phaseForDate,
  phaseLabel,
  phaseCue,
  formatShort,
  formatLong,
  formatMonthDay,
  resolveDay,
  scheduledDayId,
  estimateMinutes,
  targetLine,
  nextPhotoDate,
  trailingAverage,
  weekWeightDelta,
  latestWaist,
  weightSeries,
  waistSeries,
  weekDots,
  dayTotals,
  daysOnTarget,
  foodAverages,
  latestNote,
  lastPerformance,
  adviceForExercise,
  e1rmSeries,
  bestLifts,
  prsThisWeek,
  weekOfBlock,
  startOfWeekMonday,
  volumeOf,
  durationMin,
  fmt1,
  fmtInt,
  fmtLoad,
  fmtSet,
  formatDelta,
  formatElapsed,
  chartPoints,
  sharedMinMax,
  pointsAttr,
  checkinText,
  completedCount,
  firstOpenSet,
  exerciseCatalog,
  repLabel,
  isBannedExercise,
  BAN_REASON,
} from "./logic.js";

const TAB = {
  home: "home",
  weigh: "home",
  settings: "home",
  plan: "home",
  "plan-day": "home",
  train: "train",
  log: "train",
  summary: "train",
  progress: "train",
  history: "train",
  detail: "train",
  food: "food",
  coach: "coach",
};

export function renderApp(state) {
  try {
    return renderAppInner(state);
  } catch (err) {
    return `<div class="shell"><div class="scroll"><h1>Something went wrong</h1><p class="sub">${esc(String(err && err.message || err))}</p><button class="btn mt16" data-action="tab" data-tab="home">Back home</button></div>${nav("home")}</div>`;
  }
}

function renderAppInner(state) {
  const screen = state.screen || "home";
  const view = viewFor(state, screen);
  const tab = TAB[screen] || "home";
  return `<div class="shell">
    <div id="ptr" class="ptr">${esc(state.ptr || "")}</div>
    <div id="scroll" class="scroll${view.action ? " has-action" : ""}">${view.body}</div>
    ${view.action ? `<div class="actionbar">${view.action}</div>` : ""}
    ${nav(tab)}
    ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}
    ${sheet(state)}
  </div>`;
}

function viewFor(state, screen) {
  if (screen === "home") return { body: home(state) };
  if (screen === "weigh") return { body: weigh(state) };
  if (screen === "train") return train(state);
  if (screen === "log") return log(state);
  if (screen === "summary") return { body: summary(state) };
  if (screen === "progress") return { body: progress(state) };
  if (screen === "history") return { body: history(state) };
  if (screen === "detail") return { body: detail(state) };
  if (screen === "food") return { body: food(state) };
  if (screen === "coach") return { body: coach(state) };
  if (screen === "settings") return { body: settings(state) };
  if (screen === "plan") return { body: planEditor(state) };
  if (screen === "plan-day") return { body: planDay(state) };
  return { body: home(state) };
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function textBlock(s) {
  return esc(s).replace(/\n/g, "<br>");
}

function activeWorkout(state) {
  return (state.workouts || []).find((w) => w.status === "active") || null;
}

function nav(tab) {
  const item = (id, label, icon) =>
    `<button data-action="tab" data-tab="${id}" class="${tab === id ? "on" : ""}" aria-label="${label}">${icon}<span>${label}</span></button>`;
  return `<nav class="tabs">
    ${item("home", "Home", iconHome(tab === "home"))}
    ${item("train", "Train", iconTrain(tab === "train"))}
    ${item("food", "Food", iconFood(tab === "food"))}
    ${item("coach", "Coach", iconCoach(tab === "coach"))}
  </nav>`;
}

function subnav(current) {
  const btn = (id, label) =>
    `<button data-action="train-tab" data-tab="${id}" class="${current === id ? "on" : ""}">${label}</button>`;
  return `<div class="subnav">${btn("today", "Today")}${btn("progress", "Progress")}${btn("history", "History")}</div>`;
}

function iconHome(on) {
  const c = on ? "#b6f23c" : "#6d7583";
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"><path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>`;
}
function iconTrain(on) {
  const c = on ? "#b6f23c" : "#6d7583";
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"><path d="M6 8v8M18 8v8M8 9h8M8 15h8M3.5 7h3v10h-3zM17.5 7h3v10h-3z"/></svg>`;
}
function iconFood(on) {
  const c = on ? "#b6f23c" : "#6d7583";
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"><path d="M8 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M10 12v9M17 3v18"/></svg>`;
}
function iconCoach(on) {
  const c = on ? "#b6f23c" : "#6d7583";
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4a5 5 0 0 0-3 9v2h6v-2a5 5 0 0 0-3-9z"/><path d="M9 19h6M10 22h4"/></svg>`;
}
function gear() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9cfda" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/></svg>`;
}

function chart(dates, seriesList) {
  if (!dates || dates.length === 0) return "";
  const w = 320;
  const h = 78;
  const mm = sharedMinMax(seriesList.map((s) => s.values));
  if (!mm) return "";
  const polys = seriesList
    .map((s) => {
      const pts = chartPoints(s.values, w, h, 8, 10, mm);
      const line = `<polyline fill="none" stroke="${s.color}" stroke-width="${s.width || 3}" stroke-linejoin="round" stroke-linecap="round" points="${pointsAttr(pts)}"/>`;
      const radius = pts.filter(Boolean).length === 1 ? 6 : 3.2;
      const dots = s.dots
        ? pts.filter(Boolean).map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${radius}" fill="${s.color}"/>`).join("")
        : "";
      return line + dots;
    })
    .join("");
  const start = dates[0] ? formatMonthDay(dates[0]) : "";
  const end = dates.length > 1 ? formatMonthDay(dates[dates.length - 1]) : start;
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Trend chart">${polys}</svg>
    <div class="chart-labels"><span>${esc(start)}</span><span>${esc(end)}</span></div>`;
}

function bar(pct, klass) {
  const width = Math.max(0, Math.min(100, pct));
  return `<div class="bar"><div class="${klass || ""}" style="width:${width}%"></div></div>`;
}

function home(state) {
  const iso = state.today;
  const info = phaseForDate(state.plan, iso);
  const label = phaseLabel(state.plan, iso);
  const avg = trailingAverage(state.weighins, iso, 7);
  const todayW = (state.weighins || []).find((w) => w.date === iso && w.kg != null && w.kg !== "");
  const delta = weekWeightDelta(state.weighins, iso);
  const series = weightSeries(state.weighins, iso);
  const waist = latestWaist(state.weighins, iso);
  const wseries = waistSeries(state.weighins, iso);
  const dots = weekDots(state.workouts, iso);
  const done = dots.filter((d) => d.done).length;
  const targets = state.coach.targets;
  const foodDay = (state.coach.food_days || []).find((d) => d.date === iso);
  const totals = dayTotals(foodDay);
  const ont = daysOnTarget(state.coach.food_days, targets, iso);
  const note = latestNote(state.coach.notes, iso);
  const photo = nextPhotoDate(iso);
  const kcalPct = targets.kcal_min ? (totals.kcal / targets.kcal_min) * 100 : 0;
  const kcalOver = totals.kcal > targets.kcal_max;
  const proteinPct = targets.protein_g ? (totals.protein / targets.protein_g) * 100 : 0;

  const lifts = [
    { id: "machine-chest-press", name: "Machine chest press" },
    { id: "lat-pulldown", name: "Lat pulldown" },
  ];
  if (state.settings.topLiftId) {
    lifts.push({ id: state.settings.topLiftId, name: state.settings.topLiftName || "Your lift" });
  }

  return `
    <div class="row">
      <div class="sub mt0">${esc(formatShort(iso))}</div>
      <button class="iconbtn" data-action="settings" aria-label="Settings">${gear()}</button>
    </div>
    ${sourceLine(state)}
    <div class="row mt8">
      <h1>Dashboard</h1>
      <span class="pill phase">${esc(label)}</span>
    </div>
    ${info.status === "after" ? `<div class="banner">The written block ended ${esc(formatMonthDay(state.plan.blockEnd))}. Add a phase in Settings to keep the plan current. Until then, workouts follow ${esc(info.phase.name)} rules.</div>` : ""}
    ${info.status === "before" ? `<div class="banner">The block starts ${esc(formatLong(state.plan.blockStart))}.</div>` : ""}
    ${todayW ? "" : `<button class="prompt" data-action="weigh"><div><b>Morning weigh-in is waiting</b><span>Log it after the bathroom, before food.</span></div><span class="acc">Log it</span></button>`}
    <section class="card" data-action="weigh" role="button" tabindex="0">
      <div class="row"><span class="lbl">Weight · 7-day avg</span>${delta == null ? "" : `<span class="acc" style="font-size:13px">${esc(formatDelta(delta))} kg this week</span>`}</div>
      <div class="row mt8">
        <b style="font-size:24px">${avg == null ? "No weigh-ins yet" : `${esc(fmt1(avg))} kg`}</b>
        <span class="sub mt0">${todayW ? `today ${esc(fmt1(todayW.kg))}` : "today not logged"}</span>
      </div>
      ${series.dates.length > 1 ? chart(series.dates, [
        { values: series.raw, color: "#3a4352", width: 2 },
        { values: series.avg, color: "#b6f23c", width: 3, dots: true },
      ]) : `<p class="sub">${series.dates.length === 1 ? "One weigh-in so far. The line shows up after the next morning." : "Log a morning weigh-in to start the chart."}</p>`}
    </section>
    <div class="gap">
      <section class="card">
        <div class="lbl">Waist (Sunday)</div>
        <b style="font-size:20px">${waist.current == null ? "--" : `${esc(fmt1(waist.current))} cm`}</b>
        <div class="sub">${waist.delta == null ? (waist.current == null ? "Measure at the belly button" : "First measurement") : `${esc(formatDelta(waist.delta))} cm vs last`}</div>
        ${wseries.dates.length > 1 ? chart(wseries.dates, [{ values: wseries.values, color: "#7cc4ff", width: 3, dots: true }]) : ""}
      </section>
      <section class="card">
        <div class="lbl">Workouts</div>
        <b style="font-size:20px">${done} of 6</b>
        <div class="dots">${dots.map((d) => `<i class="${d.done ? "on" : ""} ${d.active && !d.done ? "now" : ""} ${d.future ? "future" : ""}">${d.label}</i>`).join("")}</div>
        <div class="sub" style="margin-top:8px">Days on target: ${ont.on} of ${ont.total}</div>
      </section>
    </div>
    <section class="card">
      <div class="lbl">Today's food · logged by Coach</div>
      <div class="row mt8"><span style="font-size:13px">Calories</span><span style="font-size:13px">${esc(fmtInt(totals.kcal))} / ${esc(fmtInt(targets.kcal_min))}-${esc(fmtInt(targets.kcal_max))}</span></div>
      ${bar(kcalOver ? 100 : kcalPct, kcalOver ? "amber" : "")}
      <div class="row mt8"><span style="font-size:13px">Protein</span><span style="font-size:13px">${esc(Math.round(totals.protein))} / ${esc(targets.protein_g)} g</span></div>
      ${bar(proteinPct, "blue")}
    </section>
    <section class="card">
      <div class="lbl">Top lifts · e1RM</div>
      ${lifts.map((lift) => liftRow(state, lift)).join("")}
      ${state.settings.topLiftId ? `<button class="link mt8" data-action="pick-lift">Change the third lift</button>` : `<button class="ex" data-action="pick-lift"><span><b>Choose a lift</b><span class="s">Machine chest press and lat pulldown stay. Add one more.</span></span><span class="acc last">Add</span></button>`}
    </section>
    <div class="gap">
      <section class="card">
        <div class="lbl">Next photos</div>
        <b style="font-size:15px">${esc(formatShort(photo))}</b>
        <div class="sub">Front, side, and back</div>
      </section>
      <section class="card note">
        <div class="lbl">Coach note</div>
        <div class="bodycopy" style="font-size:13px;margin-top:4px">${note ? textBlock(note.text) : "No coach note yet."}</div>
      </section>
    </div>`;
}

function liftRow(state, lift) {
  const pts = e1rmSeries(state.workouts, lift.name).concat(
    lift.id ? e1rmSeries(state.workouts, lift.id).filter((p) => !e1rmSeries(state.workouts, lift.name).some((q) => q.date === p.date && q.e1rm === p.e1rm)) : []
  );
  const series = e1rmSeries(state.workouts, lift.name);
  const byId = e1rmSeries(state.workouts, lift.id);
  const merged = mergePoints(series, byId);
  if (!merged.length) {
    return `<div class="row mt8"><span style="font-size:14px">${esc(lift.name)}</span><span class="muted" style="font-size:13px">No data yet</span></div>`;
  }
  const last = merged[merged.length - 1];
  const prev = merged.length > 1 ? merged[merged.length - 2] : null;
  const delta = prev ? last.e1rm - prev.e1rm : null;
  const deltaHtml = delta == null ? "" : `<span class="acc"> ${esc(formatDelta(delta, 0))} kg</span>`;
  return `<div class="row mt8"><span style="font-size:14px">${esc(lift.name)}</span><span style="font-size:13px">${esc(fmtLoad(last.e1rm))} kg${deltaHtml}</span></div>`;
}

function mergePoints(a, b) {
  const map = new Map();
  for (const p of [...a, ...b]) {
    const cur = map.get(p.date);
    if (!cur || p.e1rm > cur.e1rm) map.set(p.date, p);
  }
  return [...map.values()].sort((x, y) => x.date.localeCompare(y.date));
}

function sourceLine(state) {
  if (state.coachSource === "cache") return `<div class="source-line">Offline copy of the coach file. Pull down to refresh.</div>`;
  if (state.coachSource === "empty") return `<div class="source-line">Coach file is not available yet.</div>`;
  if (!state.online) return `<div class="source-line">You are offline. Saved workouts still work.</div>`;
  return "";
}

function train(state) {
  const active = activeWorkout(state);
  const scheduled = scheduledDayId(state.plan, state.today);
  const header = `
    <div class="row">
      <div class="sub mt0">${esc(formatLong(state.today))}</div>
      <button class="iconbtn" data-action="settings" aria-label="Settings">${gear()}</button>
    </div>
    ${subnav("today")}
    <div class="sub" style="margin-top:10px">${esc(phaseLabel(state.plan, state.today))}</div>`;

  if (active) {
    const mins = estimateMinutes(active.exercises.map((e) => ({ sets: e.sets.length })));
    return {
      body: `${header}
        <div class="row mt8"><h1>${esc(active.dayName)}</h1></div>
        <div class="sub">${esc(active.phaseName)} · in progress · <span id="elapsed">${esc(formatElapsed(Date.now() - new Date(active.startedAt).getTime()))}</span></div>
        <div class="row mt12"><span class="pill">${active.exercises.length} exercises</span><span class="pill">~${mins} min</span></div>
        <section class="card pad-tight">${active.exercises.map((ex, i) => {
          const done = completedCount(ex);
          return `<button class="ex" data-action="open-ex" data-i="${i}"><div><b>${ex.slot ? `<span class="tag">${esc(ex.slot)}</span>` : ""}${esc(ex.name)}</b><span class="s">${done} of ${ex.sets.length} sets · ${esc(targetLine(ex))}</span></div><span class="last ${done === ex.sets.length ? "acc" : "muted"}">${done === ex.sets.length ? "Done" : "Open"}</span></button>`;
        }).join("")}</section>
        ${noteCards(state, active.dayId)}
        <button class="btn ghost" data-action="ask-finish">Finish workout</button>`,
      action: `<button class="btn" data-action="resume">Resume logging</button>`,
    };
  }

  const doneToday = (state.workouts || [])
    .filter((w) => w.status === "done" && w.date === state.today)
    .sort((a, b) => String(b.finishedAt).localeCompare(String(a.finishedAt)));

  if (!scheduled) {
    return {
      body: `${header}
        <h1 style="margin-top:8px">Rest day</h1>
        <p class="sub">Sunday is an easy long walk, 45 to 60 minutes. It still counts toward your steps.</p>
        ${doneToday.length ? doneBanner(doneToday[0]) : ""}
        ${noteCards(state, null)}
        <section class="card flat center">Want to train anyway? Pick a workout below.</section>`,
      action: `<button class="btn" data-action="pick-day">Pick a workout</button>`,
    };
  }

  const resolved = resolveDay(state.plan, scheduled, state.today, state.coach.exercise_overrides);
  const day = resolved.day;
  const exercises = resolved.exercises;
  const mins = estimateMinutes(exercises);
  const sameDone = doneToday.find((w) => w.dayId === scheduled);

  return {
    body: `${header}
      <h1 style="margin-top:8px">${esc(day.name)}</h1>
      <p class="sub">${esc(day.focus)}</p>
      <div class="row mt12">
        <span class="pill">${exercises.length} exercises</span>
        <span class="pill">~${mins} min</span>
        <span class="pill">RIR ${esc(resolved.phase.rir)}</span>
      </div>
      ${sameDone ? doneBanner(sameDone) : ""}
      <section class="card pad-tight">${exercises.map((ex) => exercisePreview(state, scheduled, ex)).join("")}</section>
      ${noteCards(state, scheduled)}
      ${stepsCard(state)}
      <button class="link mt12" data-action="pick-day">Not this workout?</button>`,
    action: `<button class="btn" data-action="start" data-day="${esc(scheduled)}">${sameDone ? "Start again" : "Start workout"}</button>`,
  };
}

function exercisePreview(state, dayId, ex) {
  const last = lastPerformance(state.workouts, ex.name);
  const advice = adviceForExercise(state.workouts, dayId, ex.name);
  const suggested = advice && advice.type === "up" && advice.kg ? advice.kg : last && last.best && Number(last.best.kg) ? Number(last.best.kg) : null;
  const line = targetLine(ex, suggested);
  const lastTxt = last ? `Last ${fmtSet(last.best.kg, last.best.reps)}` : "No history";
  const adviceLine = advice ? `<span class="s ${advice.type === "hold" ? "amber" : "acc"}">${esc(advice.text)}</span>` : "";
  return `<div class="ex"><div>${ex.slot ? `<span class="tag">${esc(ex.slot)}</span>` : ""}<b>${esc(ex.name)}</b><span class="s">${esc(line)}</span>${adviceLine}</div><span class="last ${last ? "acc" : "dim"}">${esc(lastTxt)}</span></div>`;
}

function noteCards(state, dayId) {
  const info = phaseForDate(state.plan, state.today);
  const note = latestNote(state.coach.notes, state.today);
  const changes = (state.coach.plan_changes || []).filter((c) => c && c.text && (!c.date || c.date <= state.today));
  return `
    <section class="card">
      <div class="lbl">This phase</div>
      <p class="bodycopy" style="margin-top:4px">${esc(phaseCue(info.phase))}</p>
      ${info.phase.conditioning ? `<p class="sub">${esc(info.phase.conditioning)}</p>` : ""}
    </section>
    <section class="card note">
      <div class="lbl">Coach note</div>
      <p class="bodycopy" style="margin-top:4px">${note ? textBlock(note.text) : "No coach note yet."}</p>
    </section>
    ${changes.length ? `<section class="card warn"><div class="lbl" style="color:var(--amber)">Plan update</div><p class="bodycopy" style="margin-top:4px">${textBlock(changes[changes.length - 1].text)}</p></section>` : ""}
    ${dayId ? "" : ""}`;
}

function stepsCard(state) {
  const goal = Number(state.settings.stepGoal) || 10000;
  const steps = Number(state.steps?.[state.today] || 0);
  const pct = Math.min(100, (steps / goal) * 100);
  return `<section class="card">
    <div class="row">
      <div><div class="sub mt0">Steps today</div><b style="font-size:20px">${esc(fmtInt(steps))}</b></div>
      <div class="right"><div class="sub mt0">Goal</div><b style="font-size:20px">${esc(fmtInt(goal))}</b></div>
    </div>
    <div class="bar slim mt8"><div style="width:${pct}%"></div></div>
    <button class="link mt8" data-action="edit-steps">Update steps</button>
    <div class="sub">Typed on this phone. Apple Health is not connected.</div>
  </section>`;
}

function doneBanner(w) {
  const vol = volumeOf(w);
  return `<section class="card flat"><b>${esc(w.dayName)} is logged</b><div class="sub">${vol.sets} sets · ${esc(fmtInt(vol.volume))} kg volume</div><button class="link mt8" data-action="open-summary" data-id="${esc(w.id)}">View summary</button></section>`;
}

function log(state) {
  const w = activeWorkout(state);
  if (!w) return train(state);
  const i = Math.max(0, Math.min(w.logIndex || 0, w.exercises.length - 1));
  const ex = w.exercises[i];
  const open = firstOpenSet(ex);
  const advice = adviceForExercise(state.workouts.filter((x) => x.id !== w.id), w.dayId, ex.name);
  const rows = ex.sets
    .map((s, si) => {
      const active = si === open;
      const prev = s.prevReps ? fmtSet(s.prevKg, s.prevReps) : "·";
      return `<div class="setrow ${active ? "active" : ""}">
        <span class="setn">${si + 1}</span>
        <span class="prev">${esc(prev)}</span>
        <input inputmode="decimal" autocomplete="off" aria-label="Kilograms set ${si + 1}" data-action="set-kg" data-i="${i}" data-s="${si}" value="${s.kg == null ? "" : esc(fmtLoad(s.kg))}">
        <input inputmode="numeric" autocomplete="off" aria-label="Reps set ${si + 1}" data-action="set-reps" data-i="${i}" data-s="${si}" value="${s.reps == null ? "" : esc(String(s.reps))}">
        <button class="check ${s.completed ? "on" : ""}" data-action="toggle-set" data-i="${i}" data-s="${si}" aria-label="${s.completed ? "Undo set" : "Complete set"}">${s.completed ? "✓" : ""}</button>
      </div>`;
    })
    .join("");

  let actionLabel = "Finish workout";
  let action = "ask-finish";
  if (open >= 0) {
    actionLabel = `Log set ${open + 1}`;
    action = "log-next";
  } else if (w.exercises.some((e) => firstOpenSet(e) >= 0)) {
    actionLabel = "Next exercise";
    action = "next-ex";
  }

  return {
    body: `
      <div class="row">
        <button class="back" data-action="back-today">‹ ${esc(w.dayName)} · ${i + 1} of ${w.exercises.length}</button>
        <span class="pill" id="elapsed">${esc(formatElapsed(Date.now() - new Date(w.startedAt).getTime()))}</span>
      </div>
      <h1 style="margin-top:10px">${ex.slot ? `<span class="tag">${esc(ex.slot)}</span>` : ""}${esc(ex.name)}</h1>
      <div class="sub">Target ${esc(targetLine(ex))}</div>
      ${advice ? `<div class="sub ${advice.type === "hold" ? "amber" : "acc"}">${esc(advice.text)}</div>` : ""}
      <section class="card">
        <div class="sethead"><span>Set</span><span>Previous</span><span style="text-align:center">Kg</span><span style="text-align:center">Reps</span><span></span></div>
        ${rows}
      </section>
      ${state.logError ? `<div class="err">${esc(state.logError)}</div>` : ""}
      <div class="pair">
        <button class="pill" data-action="swap">⇄ Swap exercise</button>
        <button class="pill" data-action="add-set">+ Add set</button>
      </div>
      <div class="row mt12">
        <button class="link" data-action="remove-set" ${ex.sets.length < 2 ? "disabled" : ""}>Remove last set</button>
        <button class="link" data-action="ask-finish">Finish workout</button>
      </div>
      <div class="row">
        <button class="link" data-action="prev-ex" ${i === 0 ? "disabled" : ""}>Previous exercise</button>
        <button class="link" data-action="next-ex">Next exercise</button>
      </div>`,
    action: `<button class="btn" data-action="${action}">${esc(actionLabel)}</button>`,
  };
}

function summary(state) {
  const w = (state.workouts || []).find((x) => x.id === state.summaryId);
  if (!w) return `<button class="back" data-action="train-tab" data-tab="today">‹ Today</button><h1>Workout</h1><p class="sub">That session is not on this phone.</p>`;
  const vol = volumeOf(w);
  const mins = w.finishedAt ? durationMin(w) : null;
  const prs = w.prs || [];
  const advice = w.advice || [];
  return `
    <button class="back" data-action="train-tab" data-tab="today">‹ Today</button>
    <h1 style="margin-top:8px">Workout complete</h1>
    <p class="sub">${esc(w.dayName)} · ${esc(formatLong(w.date))}</p>
    <div class="split3">
      <section class="card stat"><span class="lbl">Time</span><b>${mins == null ? "--" : `${mins} min`}</b></section>
      <section class="card stat"><span class="lbl">Volume</span><b>${esc(fmtInt(vol.volume))}</b><div class="sub">kg</div></section>
      <section class="card stat"><span class="lbl">Sets</span><b>${vol.sets}</b></section>
    </div>
    <section class="card">
      <div class="lbl">Personal records</div>
      ${prs.length ? prs.map((p) => `<div class="ex"><b>${esc(p.name)}</b><span class="acc">${esc(fmtSet(p.kg, p.reps))} 🏆</span></div>`).join("") : `<p class="sub">No new PRs this time. Your bests update once you beat a previous estimated 1RM.</p>`}
    </section>
    <section class="card">
      <div class="lbl">Next time</div>
      ${advice.length ? advice.map((a) => `<div class="ex"><span>${esc(a.name)}</span><span class="${a.type === "hold" ? "amber" : "acc"}" style="font-size:13px;text-align:right">${esc(a.text)}</span></div>`).join("") : `<p class="sub">Keep the same loads. Move up 2.5 kg when every set hits the top of the rep range.</p>`}
    </section>
    <section class="card pad-tight">${(w.exercises || [])
      .map((ex) => {
        const done = (ex.sets || []).filter((s) => s.completed && s.reps);
        if (!done.length) return "";
        return `<div class="ex"><div><b>${esc(ex.name)}</b><span class="s">${esc(done.map((s) => fmtSet(s.kg, s.reps)).join(", "))}</span></div></div>`;
      })
      .join("")}</section>
    <button class="btn mt16" data-action="train-tab" data-tab="today">Done</button>`;
}

function progress(state) {
  const catalog = exerciseCatalog(state.plan, state.workouts);
  const selected = catalog.find((e) => e.id === state.progressId) || catalog[0];
  const id = selected ? selected.id : "";
  const name = selected ? selected.name : "";
  const pts = name ? mergePoints(e1rmSeries(state.workouts, name), e1rmSeries(state.workouts, id)) : [];
  const records = bestLifts(state.workouts);
  const last = pts[pts.length - 1];
  const prev = pts.length > 1 ? pts[pts.length - 2] : null;
  const delta = last && prev ? last.e1rm - prev.e1rm : null;
  return `
    <div class="row"><h1>Progress</h1><button class="iconbtn" data-action="settings" aria-label="Settings">${gear()}</button></div>
    ${subnav("progress")}
    <div class="chips">${catalog
      .map((e) => `<button class="pill ${e.id === id ? "on" : ""}" data-action="pick-progress" data-id="${esc(e.id)}">${esc(e.name)}</button>`)
      .join("")}</div>
    <section class="card">
      <div class="row"><b>${esc(name || "Lift")} · est. 1RM</b>${delta == null ? "" : `<span class="acc" style="font-size:13px">${esc(formatDelta(delta, 0))} kg</span>`}</div>
      ${pts.length >= 1 ? chart(pts.map((p) => p.date), [{ values: pts.map((p) => p.e1rm), color: "#b6f23c", width: 3, dots: true }]) : `<p class="sub">No sessions for this lift yet.</p>`}
      ${last ? `<div class="sub">Latest ${esc(fmtSet(last.kg, last.reps))} · e1RM ${esc(fmtLoad(last.e1rm))} kg</div>` : ""}
    </section>
    <div class="lbl mt16">Personal records</div>
    <section class="card pad-tight">
      ${records.length ? records.map((r) => `<div class="ex"><b>${esc(r.name)}</b><span class="acc">${esc(fmtSet(r.kg, r.reps))}${r.improved ? " 🏆" : ""}</span></div>`).join("") : `<p class="sub" style="padding:10px 0">Your best sets show up here after you log them.</p>`}
    </section>
    <p class="sub">Estimated 1RM uses the Epley formula: weight × (1 + reps / 30).</p>`;
}

function history(state) {
  const rows = (state.workouts || [])
    .filter((w) => w.status === "done")
    .sort((a, b) => String(b.finishedAt || b.date).localeCompare(String(a.finishedAt || a.date)));
  return `
    <div class="row"><h1>History</h1></div>
    ${subnav("history")}
    ${rows.length ? rows.map((w) => {
      const vol = volumeOf(w);
      const mins = durationMin(w);
      return `<button class="card" data-action="open-detail" data-id="${esc(w.id)}" style="width:100%;text-align:left">
        <div class="row"><b>${esc(w.dayName)}</b><span class="sub mt0">${esc(formatShort(w.date))}</span></div>
        <div class="sub">${mins || "--"} min · ${vol.sets} sets · ${esc(fmtInt(vol.volume))} kg</div>
      </button>`;
    }).join("") : `<section class="card flat center">No sessions yet. Finish a workout and it will show up here.</section>`}`;
}

function detail(state) {
  const w = (state.workouts || []).find((x) => x.id === state.detailId);
  if (!w) return `<button class="back" data-action="train-tab" data-tab="history">‹ History</button><p class="sub">Missing session.</p>`;
  const blocks = (w.exercises || [])
    .map((ex, i) => {
      const sets = (ex.sets || [])
        .map((s, si) => `<div class="setrow">
          <span class="setn">${si + 1}</span>
          <span class="prev">${s.completed ? "done" : "open"}</span>
          <input inputmode="decimal" data-action="hist-kg" data-id="${esc(w.id)}" data-i="${i}" data-s="${si}" value="${s.kg == null ? "" : esc(fmtLoad(s.kg))}" aria-label="Kilograms">
          <input inputmode="numeric" data-action="hist-reps" data-id="${esc(w.id)}" data-i="${i}" data-s="${si}" value="${s.reps == null ? "" : esc(String(s.reps))}" aria-label="Reps">
          <button class="check ${s.completed ? "on" : ""}" data-action="hist-toggle" data-id="${esc(w.id)}" data-i="${i}" data-s="${si}">${s.completed ? "✓" : ""}</button>
        </div>`)
        .join("");
      return `<section class="card"><b>${esc(ex.name)}</b><div class="sub">${esc(repLabel(ex.repsMin, ex.repsMax))} · RIR ${esc(ex.rir)}</div>${sets}</section>`;
    })
    .join("");
  return `
    <button class="back" data-action="train-tab" data-tab="history">‹ History</button>
    <h1 style="margin-top:8px">${esc(w.dayName)}</h1>
    <p class="sub">${esc(formatLong(w.date))}</p>
    ${blocks}
    <button class="btn secondary mt16" data-action="delete-workout" data-id="${esc(w.id)}">Delete this workout</button>`;
}

function food(state) {
  const iso = state.foodDate || state.today;
  const targets = state.coach.targets;
  const day = (state.coach.food_days || []).find((d) => d.date === iso);
  const totals = dayTotals(day);
  const meals = [...(day?.meals || [])].sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
  const kcalPct = targets.kcal_min ? (totals.kcal / targets.kcal_min) * 100 : 0;
  const kcalOver = totals.kcal > targets.kcal_max;
  const proteinPct = targets.protein_g ? (totals.protein / targets.protein_g) * 100 : 0;
  const atToday = iso >= state.today;
  return `
    <div class="row">
      <div>
        <div class="sub mt0">${iso === state.today ? "Today" : esc(formatLong(iso))}</div>
        <h1>Food</h1>
      </div>
    </div>
    <div class="daynav">
      <button data-action="food-prev" aria-label="Previous day">‹</button>
      <span class="sub mt0">${esc(formatShort(iso))}</span>
      <button data-action="food-next" aria-label="Next day" ${atToday ? "disabled" : ""}>›</button>
    </div>
    ${sourceLine(state)}
    <section class="card">
      <div class="lbl">Daily total · logged by Coach</div>
      <div class="row mt8"><span style="font-size:13px">Calories</span><span style="font-size:13px">${esc(fmtInt(totals.kcal))} / ${esc(fmtInt(targets.kcal_min))}-${esc(fmtInt(targets.kcal_max))}</span></div>
      ${bar(kcalOver ? 100 : kcalPct, kcalOver ? "amber" : "")}
      <div class="row mt8"><span style="font-size:13px">Protein</span><span style="font-size:13px">${esc(Math.round(totals.protein))} / ${esc(targets.protein_g)} g</span></div>
      ${bar(proteinPct, "blue")}
    </section>
    ${meals.length ? meals.map((m) => mealCard(m)).join("") : `<section class="card flat center">No meals logged for this day.</section>`}
    <section class="card flat center">Tell Coach in chat what you ate. It appears here automatically.</section>
    <p class="sub center">Estimates are written by Coach in the repo file.</p>`;
}

function mealCard(m) {
  const title = m.label ? `${m.label}${m.time ? ` · ${m.time}` : ""}` : m.name || "Meal";
  const sub = m.label ? m.name || "" : m.time || "";
  return `<section class="card" style="padding:10px 14px">
    <div class="row"><b style="font-size:14px">${esc(title)}</b><span style="font-size:13px"><span class="muted">${esc(fmtInt(Number(m.kcal) || 0))} kcal</span> · <span class="acc">${esc(String(Math.round(Number(m.protein_g) || 0)))} g</span></span></div>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
  </section>`;
}

export function buildCheckin(state) {
  const iso = state.today;
  const info = phaseForDate(state.plan, iso);
  const w = weekOfBlock(state.plan, iso);
  const start = startOfWeekMonday(iso);
  const partial = weekdayName(iso) !== "Sunday";
  const avg = (() => {
    const vals = (state.weighins || []).filter((x) => x.date >= start && x.date <= iso && x.kg != null).map((x) => Number(x.kg));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();
  const waistRow = (state.weighins || [])
    .filter((x) => x.date >= start && x.date <= iso && x.waistCm != null && x.waistCm !== "")
    .sort((a, b) => a.date.localeCompare(b.date));
  const waist = waistRow.length ? Number(waistRow[waistRow.length - 1].waistCm) : latestWaist(state.weighins, iso).current;
  const food = foodAverages(state.coach.food_days, iso);
  const ont = daysOnTarget(state.coach.food_days, state.coach.targets, iso);
  const sessions = (state.workouts || [])
    .filter((x) => x.status === "done" && x.date >= start && x.date <= iso)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.finishedAt).localeCompare(String(b.finishedAt)));
  const lines = [];
  for (const session of sessions) {
    const vol = volumeOf(session);
    const mins = durationMin(session);
    lines.push(`${formatShort(session.date)}, ${session.dayName}${mins ? ` (${mins} min, ${fmtInt(vol.volume)} kg)` : ""}`);
    for (const ex of session.exercises || []) {
      const done = (ex.sets || []).filter((s) => s.completed && s.reps);
      if (!done.length) continue;
      const best = done.reduce((a, s) => (Number(s.kg) * Number(s.reps) > Number(a.kg) * Number(a.reps) ? s : a));
      lines.push(`- ${ex.name}: ${done.map((s) => fmtSet(s.kg, s.reps)).join(", ")} (top ${fmtSet(best.kg, best.reps)})`);
    }
  }
  return checkinText({
    week: Math.max(w.week, 1),
    phase: info.phase.name,
    partial,
    range: `${formatShort(start)} to ${formatShort(iso)}`,
    workoutsDone: weekDots(state.workouts, iso).filter((d) => d.done).length,
    workoutsGoal: 6,
    weightAvg: avg,
    weightDelta: weekWeightDelta(state.weighins, iso),
    waist,
    waistDelta: latestWaist(state.weighins, iso).delta,
    kcalAvg: food.kcal,
    proteinAvg: food.protein,
    onTarget: ont.on,
    targetDays: ont.total,
    prs: prsThisWeek(state.workouts, iso),
    sessions: lines,
    note: (state.settings.coachNoteDraft || "").trim(),
  });
}

function weekdayName(iso) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(iso + "T12:00:00").getDay()];
}

function coach(state) {
  const iso = state.today;
  const info = phaseForDate(state.plan, iso);
  const w = weekOfBlock(state.plan, iso);
  const start = startOfWeekMonday(iso);
  const partial = weekdayName(iso) !== "Sunday";
  const vals = (state.weighins || []).filter((x) => x.date >= start && x.date <= iso && x.kg != null).map((x) => Number(x.kg));
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  const delta = weekWeightDelta(state.weighins, iso);
  const waist = latestWaist(state.weighins, iso);
  const food = foodAverages(state.coach.food_days, iso);
  const ont = daysOnTarget(state.coach.food_days, state.coach.targets, iso);
  const prs = prsThisWeek(state.workouts, iso);
  const done = weekDots(state.workouts, iso).filter((d) => d.done).length;
  const photo = nextPhotoDate(iso);
  const soon = photo <= addDays(iso, 7);
  const text = buildCheckin(state);
  const notes = [...(state.coach.notes || [])]
    .filter((n) => n && n.text && (!n.date || n.date <= iso))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const weekAdvice = [];
  const seen = new Set();
  for (const workout of state.workouts || []) {
    if (workout.status !== "done" || workout.date < start || workout.date > iso) continue;
    for (const item of workout.advice || []) {
      const key = item.name;
      if (seen.has(key)) continue;
      seen.add(key);
      weekAdvice.push(item);
    }
  }
  const row = (label, value, extra) =>
    `<div class="ex"><span style="font-size:14px">${label}</span><span><b style="font-size:14px">${value}</b>${extra ? ` <span class="acc" style="font-size:12px">${extra}</span>` : ""}</span></div>`;

  return `
    <div class="sub">${partial ? "This week so far" : esc(formatLong(iso))} · ${esc(phaseLabel(state.plan, iso))}</div>
    <div class="row"><h1>Weekly check-in</h1></div>
    <section class="card pad-tight">
      ${row("Workouts", `${done} of 6`)}
      ${row("Average weight", avg == null ? "None yet" : `${fmt1(avg)} kg`, delta == null ? "" : `${formatDelta(delta)} kg`)}
      ${row("Waist", waist.current == null ? "None yet" : `${fmt1(waist.current)} cm`, waist.delta == null ? "" : `${formatDelta(waist.delta)} cm`)}
      ${row("Avg calories", food.kcal == null ? "None yet" : fmtInt(food.kcal))}
      ${row("Avg protein", food.protein == null ? "None yet" : `${Math.round(food.protein)} g`)}
      ${row("Days on target", `${ont.on} of ${ont.total}`)}
      ${row("New PRs", prs.length ? esc(prs.join(", ")) : "None yet")}
    </section>
    <button class="btn mt12" data-action="copy-checkin">Copy check-in for Coach</button>
    <p class="sub center">Paste it into chat and Coach will review your week.</p>
    <section class="card ${soon ? "warn" : ""}">
      <div class="lbl" ${soon ? `style="color:var(--amber)"` : ""}>Photo reminder</div>
      <p class="bodycopy" style="margin-top:4px">${photo === iso ? "Photos are due today." : `Photos are due ${esc(formatLong(photo))}.`} Send front, side, and back to Coach in chat.</p>
    </section>
    <section class="card flat">
      <div class="lbl">Preview of copied text</div>
      <div class="mono">${esc(text)}</div>
    </section>
    ${weekAdvice.length ? `<div class="lbl mt16">From this week's lifting</div><section class="card pad-tight">${weekAdvice.map((a) => `<div class="ex"><span>${esc(a.name)}</span><span class="${a.type === "hold" ? "amber" : "acc"}" style="font-size:13px;text-align:right">${esc(a.text)}</span></div>`).join("")}</section>` : ""}
    <div class="field">
      <label for="coach-note">Note to include</label>
      <textarea id="coach-note" data-bind="settings|coachNoteDraft" placeholder="Shoulder felt fine today">${esc(state.settings.coachNoteDraft || "")}</textarea>
    </div>
    <div class="lbl mt16">Coach notes</div>
    ${notes.length ? notes.map((n) => `<section class="card note"><div class="sub mt0">${esc(n.title || "Note")}${n.date ? ` · ${esc(formatShort(n.date))}` : ""}</div><p class="bodycopy" style="margin-top:4px">${textBlock(n.text)}</p></section>`).join("") : `<section class="card">No coach notes yet.</section>`}
    <p class="sub">${esc(info.phase.name)} phase targets are ${esc(String(state.coach.targets.kcal_min))} to ${esc(String(state.coach.targets.kcal_max))} kcal and ${esc(String(state.coach.targets.protein_g))} g protein.</p>
    <button class="btn ghost" data-action="settings">Settings and backup</button>`;
}

function weigh(state) {
  const iso = state.today;
  const sunday = weekdayName(iso) === "Sunday";
  const draft = state.weigh || { mode: "weight", weight: "", waist: "" };
  const yday = (state.weighins || []).find((w) => w.date === addDays(iso, -1) && w.kg != null);
  const avg = trailingAverage(state.weighins, iso, 7);
  const lastWaist = latestWaist(state.weighins, addDays(iso, -1));
  const display = draft.mode === "waist" ? draft.waist || "0" : draft.weight || "0";
  const unit = draft.mode === "waist" ? "cm" : "kg";
  return `
    <button class="back" data-action="tab" data-tab="home">‹ Home</button>
    <div class="sub">${esc(formatShort(iso))}</div>
    <h1>Morning weigh-in</h1>
    <section class="card center" style="padding:22px 14px">
      <div class="lbl">${draft.mode === "waist" ? "Waist at belly button" : "Today's weight"}</div>
      <div class="bigwt ${draft.mode === "weight" ? "acc" : "blue"}">${esc(display)}<small>${unit}</small></div>
    </section>
    <div class="gap">
      <section class="card"><div class="lbl">Yesterday</div><b style="font-size:20px">${yday ? `${esc(fmt1(yday.kg))} kg` : "None"}</b></section>
      <section class="card"><div class="lbl">7-day avg</div><b style="font-size:20px">${avg == null ? "None" : `${esc(fmt1(avg))} kg`}</b></section>
    </div>
    ${sunday ? `<button class="card" data-action="focus-waist" style="width:100%;text-align:left"><div class="row"><div><div class="lbl">Waist at belly button</div><div class="sub">Sundays only${lastWaist.current ? ` · last ${esc(fmt1(lastWaist.current))} cm` : ""}</div></div><span class="pill ${draft.mode === "waist" ? "field-hot" : ""}" style="font-size:16px">${draft.waist ? esc(draft.waist) : "--"} cm</span></div></button>` : ""}
    ${state.weighError ? `<div class="err">${esc(state.weighError)}</div>` : ""}
    <div class="pad">
      ${["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "bksp"].map((k) => `<button data-action="pad" data-key="${k}" aria-label="${k === "bksp" ? "Delete" : k}">${k === "bksp" ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6h11v12H9l-6-6z"/><path d="m13 10 4 4M17 10l-4 4"/></svg>` : k}</button>`).join("")}
    </div>
    <button class="btn mt12" data-action="save-weigh">Save weigh-in</button>
    <button class="link mt12" data-action="focus-weight" style="display:block;text-align:center">${draft.mode === "waist" ? "Back to weight" : ""}</button>`;
}

function settings(state) {
  const lift = state.settings.topLiftName || "None chosen";
  return `
    <button class="back" data-action="tab" data-tab="home">‹ Home</button>
    <h1 style="margin-top:8px">Settings</h1>
    <p class="sub">Workouts, weigh-ins, and the plan live on this phone.</p>
    <section class="card">
      <div class="lbl">Backup</div>
      <button class="btn mt12" data-action="export">Export JSON</button>
      <button class="btn secondary mt8" data-action="import-open">Import JSON</button>
      <p class="sub">Export before you clear Safari data. Import replaces what is on this phone.</p>
    </section>
    <section class="card">
      <div class="lbl">Third top lift</div>
      <div class="row mt8"><b>${esc(lift)}</b><button class="link" data-action="pick-lift">Change</button></div>
      <div class="field">
        <label for="step-goal">Daily step goal</label>
        <input id="step-goal" inputmode="numeric" data-bind="settings|stepGoal" value="${esc(String(state.settings.stepGoal || 10000))}">
      </div>
    </section>
    <button class="btn secondary" data-action="open-plan">Edit training plan</button>
    <button class="btn ghost" data-action="reset-plan">Reset plan to the original 8 weeks</button>
    <section class="card">
      <div class="lbl">On this phone</div>
      <p class="bodycopy">No account and no Apple Health. The gym works offline after the app has loaded once. Food and coach notes update when <b>data/coach.json</b> changes in the repo.</p>
    </section>`;
}

function planEditor(state) {
  const plan = state.plan;
  const phases = plan.phases || [];
  return `
    <button class="back" data-action="settings">‹ Settings</button>
    <h1 style="margin-top:8px">Training plan</h1>
    <p class="sub">${esc(plan.name)}. Week numbering uses the block dates.</p>
    <div class="inline-2">
      <div class="field"><label>Block start</label><input data-bind="plan|blockStart" value="${esc(plan.blockStart)}"></div>
      <div class="field"><label>Block end</label><input data-bind="plan|blockEnd" value="${esc(plan.blockEnd)}"></div>
    </div>
    <div class="field"><label>Weeks in the block</label><input inputmode="numeric" data-bind="plan|weeks" value="${esc(String(plan.weeks || 8))}"></div>
    <div class="lbl mt16">Phases</div>
    ${phases
      .map((p, i) => `<section class="card">
        <div class="field"><label>Name</label><input data-bind="phase|${i}|name" value="${esc(p.name)}"></div>
        <div class="inline-2">
          <div class="field"><label>Start</label><input data-bind="phase|${i}|start" value="${esc(p.start)}"></div>
          <div class="field"><label>End</label><input data-bind="phase|${i}|end" value="${esc(p.end)}"></div>
        </div>
        <div class="field"><label>Sets</label><select data-bind="phase|${i}|setMod">${SET_MODS.map((m) => `<option value="${m.id}" ${p.setMod === m.id ? "selected" : ""}>${esc(m.label)}</option>`).join("")}</select></div>
        <div class="field"><label>RIR</label><input data-bind="phase|${i}|rir" value="${esc(p.rir)}"></div>
        <div class="field"><label>Conditioning note</label><input data-bind="phase|${i}|conditioning" value="${esc(p.conditioning || "")}"></div>
        ${phases.length > 1 ? `<button class="btn ghost" data-action="delete-phase" data-i="${i}">Delete phase</button>` : ""}
      </section>`)
      .join("")}
    <button class="btn secondary mt12" data-action="add-phase">Add phase</button>
    <button class="btn mt8" data-action="continue-phase">Continue 4 more weeks</button>
    <div class="lbl mt16">Schedule</div>
    <section class="card">
      ${WEEKDAYS.map((d) => `<div class="field"><label>${d.label}</label><select data-bind="schedule|${d.key}"><option value="" ${!plan.schedule?.[d.key] ? "selected" : ""}>Rest</option>${(plan.days || []).map((day) => `<option value="${esc(day.id)}" ${plan.schedule?.[d.key] === day.id ? "selected" : ""}>${esc(day.name)}</option>`).join("")}</select></div>`).join("")}
    </section>
    <div class="lbl mt16">Workouts</div>
    ${(plan.days || []).map((day) => `<button class="card" data-action="open-plan-day" data-id="${esc(day.id)}" style="width:100%;text-align:left"><div class="row"><b>${esc(day.name)}</b><span class="sub mt0">${day.exercises.length} exercises</span></div><div class="sub">${esc(day.focus || "")}</div></button>`).join("")}`;
}

function planDay(state) {
  const day = (state.plan.days || []).find((d) => d.id === state.planDayId);
  if (!day) return `<button class="back" data-action="open-plan">‹ Plan</button><p>Missing day.</p>`;
  return `
    <button class="back" data-action="open-plan">‹ Plan</button>
    <div class="field"><label>Name</label><input data-bind="day|${esc(day.id)}|name" value="${esc(day.name)}"></div>
    <div class="field"><label>Focus</label><input data-bind="day|${esc(day.id)}|focus" value="${esc(day.focus || "")}"></div>
    <p class="sub">A and B moves get extra sets in Push and Peak. Give two exercises the same letter to make a superset.</p>
    ${(day.exercises || [])
      .map((ex, i) => `<section class="card">
        <div class="field"><label>Exercise ${i + 1}</label><input data-bind="ex|${esc(day.id)}|${i}|name" value="${esc(ex.name)}"></div>
        <div class="inline-2">
          <div class="field"><label>Sets</label><input inputmode="numeric" data-bind="ex|${esc(day.id)}|${i}|sets" value="${esc(String(ex.sets))}"></div>
          <div class="field"><label>Letter</label><input data-bind="ex|${esc(day.id)}|${i}|superset" value="${esc(ex.superset || "")}" maxlength="1"></div>
        </div>
        <div class="inline-2">
          <div class="field"><label>Reps min</label><input inputmode="numeric" data-bind="ex|${esc(day.id)}|${i}|repsMin" value="${esc(String(ex.repsMin))}"></div>
          <div class="field"><label>Reps max</label><input inputmode="numeric" data-bind="ex|${esc(day.id)}|${i}|repsMax" value="${esc(String(ex.repsMax))}"></div>
        </div>
        <div class="row mt8">
          <button class="link" data-action="move-ex" data-id="${esc(day.id)}" data-i="${i}" data-dir="-1">Up</button>
          <button class="link" data-action="move-ex" data-id="${esc(day.id)}" data-i="${i}" data-dir="1">Down</button>
          <button class="link amber" data-action="delete-ex" data-id="${esc(day.id)}" data-i="${i}">Delete</button>
        </div>
      </section>`)
      .join("")}
    <div class="field"><label for="new-ex">Add exercise</label><input id="new-ex" placeholder="Chest-supported row"></div>
    <button class="btn mt12" data-action="add-ex" data-id="${esc(day.id)}">Add exercise</button>
    ${state.planError ? `<div class="err">${esc(state.planError)}</div>` : ""}
    <p class="sub">${esc(BAN_REASON)}</p>`;
}

function sheet(state) {
  const s = state.sheet;
  if (!s) return "";
  let body = "";
  if (s.type === "days") {
    body = `<h2>Pick a workout</h2>
      ${(state.plan.days || []).map((d) => `<button class="choice" data-action="start" data-day="${esc(d.id)}">${esc(d.name)}<small>${esc(d.focus || "")}</small></button>`).join("")}
      <button class="btn ghost" data-action="close-sheet">Cancel</button>`;
  } else if (s.type === "swap") {
    const w = activeWorkout(state);
    const ex = w?.exercises?.[w.logIndex || 0];
    const options = (ex && SAFE_SWAPS[ex.exerciseId]) || [];
    const extra = Object.values(SAFE_SWAPS)
      .flat()
      .filter((name, idx, arr) => arr.indexOf(name) === idx && !options.includes(name) && (!ex || name !== ex.name))
      .slice(0, 8);
    body = `<h2>Swap exercise</h2>
      <p class="sub">Shoulder-safe options only. ${esc(BAN_REASON)}</p>
      ${options.map((name) => `<button class="choice" data-action="do-swap" data-name="${esc(name)}">${esc(name)}</button>`).join("")}
      ${extra.length ? `<div class="lbl mt16">More safe options</div>${extra.map((name) => `<button class="choice" data-action="do-swap" data-name="${esc(name)}">${esc(name)}</button>`).join("")}` : ""}
      <div class="field"><label for="swap-custom">Custom exercise</label><input id="swap-custom" placeholder="Chest-supported row"></div>
      <button class="btn mt12" data-action="swap-custom">Use custom exercise</button>
      ${state.planError ? `<div class="err">${esc(state.planError)}</div>` : ""}
      <button class="btn ghost" data-action="close-sheet">Cancel</button>`;
  } else if (s.type === "confirm") {
    body = `<h2>${esc(s.title || "Confirm")}</h2><p class="bodycopy" style="margin-top:8px">${esc(s.body || "")}</p>
      <button class="btn mt16" data-action="${esc(s.confirmAction)}" ${s.payload || ""}>${esc(s.confirmLabel || "Confirm")}</button>
      <button class="btn ghost" data-action="close-sheet">Cancel</button>`;
  } else if (s.type === "lift") {
    const catalog = exerciseCatalog(state.plan, state.workouts).filter((e) => e.id !== "machine-chest-press" && e.id !== "lat-pulldown");
    body = `<h2>Choose a lift</h2><p class="sub">This is the third e1RM on Home, next to machine chest press and lat pulldown.</p>
      ${catalog.map((e) => `<button class="choice" data-action="set-lift" data-id="${esc(e.id)}" data-name="${esc(e.name)}">${esc(e.name)}</button>`).join("")}
      <button class="btn ghost" data-action="close-sheet">Cancel</button>`;
  } else if (s.type === "steps") {
    body = `<h2>Steps today</h2>
      <div class="field"><label for="steps-input">Steps</label><input id="steps-input" inputmode="numeric" value="${esc(String(state.steps?.[state.today] || ""))}"></div>
      <button class="btn mt12" data-action="save-steps">Save steps</button>
      <button class="btn ghost" data-action="close-sheet">Cancel</button>`;
  } else if (s.type === "import") {
    body = `<h2>Import backup</h2>
      <p class="sub">This replaces workouts, weigh-ins, steps, settings, and the plan on this phone.</p>
      <div class="field"><label for="import-file">JSON file</label><input id="import-file" type="file" accept="application/json,.json"></div>
      <div class="field"><label for="import-text">Or paste JSON</label><textarea id="import-text" placeholder="{ &quot;app&quot;: &quot;workout-tracker&quot; }"></textarea></div>
      <button class="btn mt12" data-action="do-import">Import</button>
      ${state.planError ? `<div class="err">${esc(state.planError)}</div>` : ""}
      <button class="btn ghost" data-action="close-sheet">Cancel</button>`;
  }
  return `<div class="backdrop" data-action="close-sheet"><div class="sheet" data-action="stop">${body ? `<div class="handle"></div>${body}` : ""}</div></div>`;
}

export function backupPayload(state) {
  return {
    app: "workout-tracker",
    version: 1,
    exportedAt: new Date().toISOString(),
    plan: state.plan,
    workouts: state.workouts,
    weighins: state.weighins,
    steps: state.steps,
    settings: state.settings,
  };
}
