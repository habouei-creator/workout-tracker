// Dates, plan rules, progression, and check-in text. No DOM.

export function pad(n) {
  return String(n).padStart(2, "0");
}

export function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function weekday(iso) {
  return parseDate(iso).getDay();
}

export function startOfWeekMonday(iso) {
  const d = parseDate(iso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return isoDate(d);
}

export function formatShort(iso) {
  return parseDate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatLong(iso) {
  return parseDate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatMonthDay(iso) {
  return parseDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatWeekdayMonthDay(iso) {
  return parseDate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function uid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}

export function slug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function norm(s) {
  return String(s || "").trim().toLowerCase();
}

export function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function fmtLoad(n) {
  if (n == null || n === "" || Number.isNaN(Number(n))) return "";
  const x = Math.round(Number(n) * 100) / 100;
  if (Number.isInteger(x)) return String(x);
  return String(x);
}

export function fmt1(n) {
  if (n == null || Number.isNaN(Number(n))) return "";
  return Number(n).toFixed(1);
}

export function fmtInt(n) {
  if (n == null || Number.isNaN(Number(n))) return "";
  return Math.round(Number(n)).toLocaleString("en-US");
}

export function formatDelta(n, digits = 1) {
  if (n == null || Number.isNaN(Number(n))) return "";
  const v = Number(Number(n).toFixed(digits));
  const body = digits === 0 ? String(Math.round(v)) : v.toFixed(digits);
  if (v > 0) return `+${body}`;
  return body;
}

export function avg(list) {
  if (!list.length) return null;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

export function e1rm(kg, reps) {
  const w = Number(kg);
  const r = Number(reps);
  if (!w || !r || r < 1) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

export function fmtSet(kg, reps, loadType) {
  if (reps == null || reps === "") return "";
  const n = Number(kg);
  if (loadType === "added") return `+${fmtLoad(Math.abs(n))} kg x ${reps}`;
  if (loadType === "assisted" || n < 0) return `${fmtLoad(n)} kg x ${reps}`;
  if (!n) return `BW x ${reps}`;
  return `${fmtLoad(n)} x ${reps}`;
}

export function formatKg(kg, loadType) {
  const n = Number(kg);
  if (loadType === "added") return `+${fmtLoad(Math.abs(n))} kg`;
  if (loadType === "assisted" || n < 0) return `${fmtLoad(n)} kg`;
  return `${fmtLoad(n)} kg`;
}

export function repLabel(min, max) {
  if (Number(min) === Number(max)) return String(min);
  return `${min}-${max}`;
}

export function formatElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h) return `${h}:${pad(m)}:${pad(ss)}`;
  return `${m}:${pad(ss)}`;
}

const BANNED = [
  /overhead/i,
  /shoulder press/i,
  /military press/i,
  /\bohp\b/i,
  /\bdips?\b/i,
  /bench press/i,
  /barbell bench/i,
];

export function isBannedExercise(name) {
  return BANNED.some((re) => re.test(String(name || "")));
}

export const BAN_REASON =
  "That movement is off the list because of your shoulder. No overhead pressing, dips, or barbell bench.";

export function prescribedSets(sets) {
  const n = Number(sets);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export function phaseForDate(plan, iso) {
  const phases = [...(plan.phases || [])].sort((a, b) => a.start.localeCompare(b.start));
  if (!phases.length) {
    return {
      phase: { name: "Training", setMod: "as-written", rir: "2", start: iso, end: iso, conditioning: "" },
      status: "after",
    };
  }
  const hits = phases.filter((p) => iso >= p.start && iso <= p.end);
  if (hits.length) {
    const phase = hits.sort((a, b) => b.start.localeCompare(a.start))[0];
    const inBlock = iso >= plan.blockStart && iso <= plan.blockEnd;
    return { phase, status: inBlock ? "in" : "extended" };
  }
  if (iso < phases[0].start) return { phase: phases[0], status: "before" };
  const prev = [...phases].reverse().find((p) => p.end < iso) || phases[phases.length - 1];
  return { phase: prev, status: "after" };
}

export function weekOfBlock(plan, iso) {
  const diff = Math.round((parseDate(iso) - parseDate(plan.blockStart)) / 86400000);
  if (diff < 0) return { week: 0, status: "before", of: plan.weeks || 8 };
  const week = Math.floor(diff / 7) + 1;
  if (iso > plan.blockEnd) return { week, status: "after", of: plan.weeks || 8 };
  return { week: Math.min(week, plan.weeks || 8), status: "in", of: plan.weeks || 8 };
}

export function phaseLabel(plan, iso) {
  const { phase, status } = phaseForDate(plan, iso);
  const w = weekOfBlock(plan, iso);
  if (status === "before") return `Starts ${formatMonthDay(plan.blockStart)}`;
  if (w.status === "in" && status === "in") return `${phase.name} phase · week ${w.week} of ${w.of}`;
  if (status === "extended") return `${phase.name} · week ${w.week}`;
  return `${phase.name} rules · week ${w.week}`;
}

export function phaseCue(phase) {
  const rir = String(phase.rir ?? "2");
  let effort = `Stop each set with about ${rir} reps in reserve.`;
  if (rir === "1") effort = "Stop each set with about 1 rep in reserve.";
  if (rir === "0-1") effort = "Stop with 0 or 1 rep in reserve.";
  if (phase.setMod === "half") return `Deload week. Keep 3 sets and use about 10% less weight. ${effort}`;
  return `3 sets. ${effort}`;
}

export function roundHalf(n) {
  return Math.round(Number(n) * 2) / 2;
}

export function deloadTarget(kg, loadType) {
  const n = Number(kg);
  if (!Number.isFinite(n) || n === 0) {
    return { kg: null, text: "Deload: use about 10% less weight than usual." };
  }
  if (loadType === "assisted" || n < 0) {
    const more = roundHalf(Math.abs(n) * 1.1);
    return { kg: -more, text: `Deload: try ${fmtLoad(-more)} kg, about 10% more assistance.` };
  }
  const lighter = roundHalf(Math.abs(n) * 0.9);
  const shown = loadType === "added" ? `+${fmtLoad(lighter)} kg` : `${fmtLoad(lighter)} kg`;
  return { kg: lighter, text: `Deload: try ${shown}, about 10% lighter.` };
}

export function moveInList(list, from, steps) {
  const next = list.slice();
  if (from < 0 || from >= next.length || !steps) return next;
  const to = Math.max(0, Math.min(next.length - 1, from + steps));
  if (to === from) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function withSlots(exercises) {
  const counts = {};
  for (const e of exercises) {
    if (e.superset) counts[e.superset] = (counts[e.superset] || 0) + 1;
  }
  const seen = {};
  return exercises.map((e) => {
    if (!e.superset || counts[e.superset] < 2) return { ...e, slot: null };
    seen[e.superset] = (seen[e.superset] || 0) + 1;
    return { ...e, slot: `${e.superset}${seen[e.superset]}` };
  });
}

function matchOverride(overrides, day, ex, iso) {
  for (const o of overrides || []) {
    if (!o) continue;
    const dayOk =
      !o.day || norm(o.day) === norm(day.id) || norm(o.day) === norm(day.name) || norm(o.day) === norm(day.name.replace(" ", ""));
    const exOk = !o.exercise || norm(o.exercise) === norm(ex.name) || norm(o.exercise) === norm(ex.id);
    const fromOk = !o.applies_from || iso >= o.applies_from;
    const toOk = !o.applies_to || iso <= o.applies_to;
    if (dayOk && exOk && fromOk && toOk) return o;
  }
  return null;
}

export function resolveDay(plan, dayId, iso, overrides = []) {
  const day = (plan.days || []).find((d) => d.id === dayId);
  if (!day) return null;
  const { phase, status } = phaseForDate(plan, iso);
  const exercises = day.exercises.map((ex) => {
    let sets = prescribedSets(ex.sets);
    let repsMin = ex.repsMin;
    let repsMax = ex.repsMax;
    let name = ex.name;
    let id = ex.id;
    let rir = String(phase.rir ?? "2");
    const hit = matchOverride(overrides, day, ex, iso);
    if (hit) {
      if (hit.sets != null && hit.sets !== "") sets = Number(hit.sets);
      if (hit.reps_min != null && hit.reps_min !== "") repsMin = Number(hit.reps_min);
      if (hit.reps_max != null && hit.reps_max !== "") repsMax = Number(hit.reps_max);
      if (hit.rir != null && hit.rir !== "") rir = String(hit.rir);
      if (hit.replace_with && !isBannedExercise(hit.replace_with)) {
        name = String(hit.replace_with);
        id = slug(name);
      }
    }
    return { id, name, superset: ex.superset, sets, repsMin, repsMax, rir, loadType: ex.loadType || null };
  });
  return { day, phase, status, exercises: withSlots(exercises) };
}

export function scheduledDayId(plan, iso) {
  const key = String(weekday(iso));
  const id = plan.schedule ? plan.schedule[key] : null;
  return id || null;
}

export function estimateMinutes(exercises) {
  const sets = exercises.reduce((n, ex) => n + (Number(ex.sets || ex.targetSets) || 0), 0);
  return Math.max(25, Math.round(sets * 2 + exercises.length));
}

export function targetLine(ex, suggestedKg) {
  const reps = repLabel(ex.repsMin, ex.repsMax);
  const sets = ex.targetSets || ex.sets;
  const load = suggestedKg == null || suggestedKg === "" ? "" : ` · ${formatKg(suggestedKg, ex.loadType)}`;
  return `${sets} x ${reps}${load} · RIR ${ex.rir}`;
}

export const PHOTO_START = "2026-11-29";

export function nextPhotoDate(iso) {
  let d = PHOTO_START;
  if (iso <= d) return d;
  while (d < iso) d = addDays(d, 14);
  return d;
}

export function trailingAverage(weighins, iso, days = 7) {
  const start = addDays(iso, -(days - 1));
  const vals = (weighins || [])
    .filter((w) => w.date >= start && w.date <= iso && w.kg != null && w.kg !== "")
    .map((w) => Number(w.kg));
  return avg(vals);
}

export function weekWeightDelta(weighins, iso) {
  const thisStart = startOfWeekMonday(iso);
  const prevStart = addDays(thisStart, -7);
  const prevEnd = addDays(thisStart, -1);
  const thisVals = (weighins || [])
    .filter((w) => w.date >= thisStart && w.date <= iso && w.kg != null)
    .map((w) => Number(w.kg));
  const prevVals = (weighins || [])
    .filter((w) => w.date >= prevStart && w.date <= prevEnd && w.kg != null)
    .map((w) => Number(w.kg));
  if (!thisVals.length || !prevVals.length) return null;
  return avg(thisVals) - avg(prevVals);
}

export function latestWaist(weighins, iso) {
  const rows = (weighins || [])
    .filter((w) => w.date <= iso && w.waistCm != null && w.waistCm !== "")
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!rows.length) return { current: null, delta: null };
  const current = Number(rows[rows.length - 1].waistCm);
  const prev = rows.length > 1 ? Number(rows[rows.length - 2].waistCm) : null;
  return { current, delta: prev == null ? null : current - prev, date: rows[rows.length - 1].date };
}

export function weightSeries(weighins, iso, days = 42) {
  const start = addDays(iso, -(days - 1));
  const inRange = (weighins || [])
    .filter((w) => w.date >= start && w.date <= iso && w.kg != null && w.kg !== "")
    .sort((a, b) => a.date.localeCompare(b.date));
  const dates = inRange.map((w) => w.date);
  const raw = inRange.map((w) => Number(w.kg));
  const avgLine = dates.map((d) => trailingAverage(weighins, d, 7));
  return { dates, raw, avg: avgLine };
}

export function waistSeries(weighins, iso) {
  const rows = (weighins || [])
    .filter((w) => w.date <= iso && w.waistCm != null && w.waistCm !== "")
    .sort((a, b) => a.date.localeCompare(b.date));
  return { dates: rows.map((r) => r.date), values: rows.map((r) => Number(r.waistCm)) };
}

export function weekDots(workouts, iso) {
  const start = startOfWeekMonday(iso);
  const labels = ["M", "T", "W", "T", "F", "S"];
  return labels.map((label, i) => {
    const date = addDays(start, i);
    const done = (workouts || []).some((w) => w.status === "done" && w.date === date);
    const active = (workouts || []).some((w) => w.status === "active" && w.date === date);
    return { label, date, done, active, future: date > iso };
  });
}

export function dayTotals(day) {
  const meals = day?.meals || [];
  return {
    kcal: meals.reduce((s, m) => s + (Number(m.kcal) || 0), 0),
    protein: meals.reduce((s, m) => s + (Number(m.protein_g) || 0), 0),
  };
}

export function isOnTarget(day, targets) {
  if (!day || !day.meals || !day.meals.length) return false;
  const t = dayTotals(day);
  return t.kcal >= targets.kcal_min && t.kcal <= targets.kcal_max && t.protein >= targets.protein_g;
}

export function daysOnTarget(foodDays, targets, iso) {
  const start = startOfWeekMonday(iso);
  let on = 0;
  let total = 0;
  for (let d = start; d <= iso; d = addDays(d, 1)) {
    total += 1;
    const day = (foodDays || []).find((f) => f.date === d);
    if (isOnTarget(day, targets)) on += 1;
  }
  return { on, total };
}

export function foodAverages(foodDays, iso) {
  const start = startOfWeekMonday(iso);
  const days = (foodDays || []).filter((d) => d.date >= start && d.date <= iso && d.meals && d.meals.length);
  if (!days.length) return { kcal: null, protein: null, days: 0 };
  const totals = days.map((d) => dayTotals(d));
  return {
    kcal: avg(totals.map((t) => t.kcal)),
    protein: avg(totals.map((t) => t.protein)),
    days: days.length,
  };
}

export function latestNote(notes, iso) {
  const list = (notes || []).filter((n) => n && n.text && (!n.date || n.date <= iso));
  list.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return list[0] || null;
}

export function lastPerformance(workouts, exerciseName, exceptId) {
  const list = (workouts || [])
    .map((w, index) => ({ w, index }))
    .filter(({ w }) => w.status === "done" && w.id !== exceptId)
    .sort((a, b) => {
      const byTime = String(b.w.finishedAt || b.w.date).localeCompare(String(a.w.finishedAt || a.w.date));
      return byTime || b.index - a.index;
    })
    .map(({ w }) => w);
  for (const w of list) {
    const ex = (w.exercises || []).find((e) => norm(e.name) === norm(exerciseName));
    if (!ex) continue;
    const sets = (ex.sets || []).filter((s) => s.completed && s.reps);
    if (!sets.length) continue;
    const best = sets.reduce((a, s) => (e1rm(s.kg, s.reps) > e1rm(a.kg, a.reps) ? s : a));
    return { workout: w, exercise: ex, sets, best };
  }
  return null;
}

export function prefillSets(count, lastSets) {
  return Array.from({ length: count }, (_, i) => {
    const prev = lastSets ? lastSets[i] : null;
    const fill = lastSets ? lastSets[i] || lastSets[lastSets.length - 1] : null;
    return {
      kg: fill && fill.kg != null && fill.kg !== "" ? Number(fill.kg) : null,
      reps: fill && fill.reps != null && fill.reps !== "" ? Number(fill.reps) : null,
      completed: false,
      prevKg: prev && prev.kg != null && prev.kg !== "" ? Number(prev.kg) : null,
      prevReps: prev && prev.reps != null && prev.reps !== "" ? Number(prev.reps) : null,
    };
  });
}

export function createWorkout(plan, priorWorkouts, dayId, iso, overrides = []) {
  const resolved = resolveDay(plan, dayId, iso, overrides);
  if (!resolved) return null;
  const exercises = resolved.exercises.map((ex) => {
    const last = lastPerformance(priorWorkouts, ex.name);
    return {
      exerciseId: ex.id,
      name: ex.name,
      superset: ex.superset,
      slot: ex.slot,
      targetSets: ex.sets,
      repsMin: ex.repsMin,
      repsMax: ex.repsMax,
      rir: ex.rir,
      loadType: ex.loadType || null,
      sets: prefillSets(ex.sets, last ? last.sets : null),
    };
  });
  return {
    id: uid(),
    date: iso,
    dayId,
    dayName: resolved.day.name,
    phaseName: resolved.phase.name,
    phaseStatus: resolved.status,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "active",
    logIndex: 0,
    exercises,
    prs: [],
    advice: [],
  };
}

export function sessionResult(exercise) {
  const done = (exercise.sets || []).filter((s) => s.completed && Number(s.reps) > 0);
  const target = Number(exercise.targetSets) || done.length;
  const allDone = done.length >= target;
  const hitTop = allDone && done.length > 0 && done.every((s) => Number(s.reps) >= Number(exercise.repsMax));
  const miss = !allDone || done.some((s) => Number(s.reps) < Number(exercise.repsMin));
  const weights = done.map((s) => Number(s.kg) || 0);
  const minWeight = weights.length ? Math.min(...weights) : 0;
  const loadType = exercise.loadType || (done.some((s) => Number(s.kg) < 0) ? "assisted" : null);
  return { hitTop, miss, minWeight, doneCount: done.length, loadType };
}

export function historyResults(workouts, dayId, exerciseName) {
  return (workouts || [])
    .map((w, index) => ({ w, index }))
    .filter(({ w }) => w.status === "done" && w.dayId === dayId)
    .sort((a, b) => {
      const byTime = String(b.w.finishedAt || b.w.date).localeCompare(String(a.w.finishedAt || a.w.date));
      return byTime || b.index - a.index;
    })
    .flatMap(({ w }) =>
      (w.exercises || [])
        .filter((e) => norm(e.name) === norm(exerciseName))
        .map((e) => ({ ...sessionResult(e), date: w.date, id: w.id }))
    );
}

export function progressionAdvice(resultsNewestFirst) {
  if (!resultsNewestFirst.length) return null;
  const latest = resultsNewestFirst[0];
  const assisted = latest.loadType === "assisted";
  const added = latest.loadType === "added";
  if (latest.hitTop) {
    if (assisted) {
      const next = Math.round((latest.minWeight + 2.5) * 100) / 100;
      return {
        type: "up",
        kg: next,
        text: `Try ${fmtLoad(next)} kg next time (2.5 kg less assistance).`,
      };
    }
    if (latest.minWeight > 0) {
      const next = Math.round((latest.minWeight + 2.5) * 100) / 100;
      const shown = added ? `+${fmtLoad(next)} kg` : `${fmtLoad(next)} kg`;
      return {
        type: "up",
        kg: next,
        text: `Try ${shown} next time (+2.5 kg).`,
      };
    }
    return {
      type: "up",
      kg: null,
      text: "You hit the top of the range. Add a little load next time if the movement allows it.",
    };
  }
  if (resultsNewestFirst.length >= 2 && resultsNewestFirst[0].miss && resultsNewestFirst[1].miss) {
    if (assisted) {
      const more = Math.round((latest.minWeight - 2.5) * 100) / 100;
      return {
        type: "hold",
        kg: latest.minWeight,
        text: `Two misses in a row. Hold ${fmtLoad(latest.minWeight)} kg or use ${fmtLoad(more)} kg of assistance.`,
      };
    }
    if (latest.minWeight > 0) {
      const drop = Math.round(Math.max(0, latest.minWeight - 2.5) * 100) / 100;
      return {
        type: "hold",
        kg: latest.minWeight,
        text: `Two misses in a row. Hold ${fmtLoad(latest.minWeight)} kg or drop to ${fmtLoad(drop)} kg.`,
      };
    }
    return {
      type: "hold",
      kg: null,
      text: "Two misses in a row. Hold here, or make the movement a bit easier.",
    };
  }
  return null;
}

export function adviceForExercise(workouts, dayId, exerciseName) {
  return progressionAdvice(historyResults(workouts, dayId, exerciseName));
}

export function detectPRs(workout, previousWorkouts) {
  const prs = [];
  for (const ex of workout.exercises || []) {
    const done = (ex.sets || []).filter((s) => s.completed && Number(s.reps) > 0 && Number(s.kg) > 0 && ex.loadType !== "assisted");
    if (!done.length) continue;
    const best = done.reduce((a, s) => (e1rm(s.kg, s.reps) > e1rm(a.kg, a.reps) ? s : a));
    const bestE = e1rm(best.kg, best.reps);
    let prevBest = 0;
    for (const w of previousWorkouts || []) {
      if (w.status !== "done") continue;
      for (const pex of w.exercises || []) {
        if (norm(pex.name) !== norm(ex.name)) continue;
        for (const s of pex.sets || []) {
          if (!s.completed || !Number(s.kg) || !Number(s.reps)) continue;
          prevBest = Math.max(prevBest, e1rm(s.kg, s.reps));
        }
      }
    }
    if (prevBest > 0 && bestE > prevBest + 0.05) {
      prs.push({
        name: ex.name,
        kg: Number(best.kg),
        reps: Number(best.reps),
        loadType: ex.loadType || null,
        e1rm: Math.round(bestE * 10) / 10,
        delta: Math.round((bestE - prevBest) * 10) / 10,
      });
    }
  }
  return prs;
}

export function adviceForWorkout(workout, priorDone) {
  const combined = [...(priorDone || []), { ...workout, status: "done" }];
  const out = [];
  for (const ex of workout.exercises || []) {
    const advice = adviceForExercise(combined, workout.dayId, ex.name);
    if (advice) out.push({ name: ex.name, ...advice });
  }
  return out;
}

export function finishWorkout(workout, priorDone) {
  const done = {
    ...workout,
    status: "done",
    finishedAt: new Date().toISOString(),
    exercises: (workout.exercises || []).map((e) => ({
      ...e,
      sets: (e.sets || []).map((s) => ({ ...s })),
    })),
  };
  done.prs = detectPRs(done, priorDone);
  done.advice = adviceForWorkout(done, priorDone);
  return done;
}

export function volumeOf(workout) {
  let volume = 0;
  let sets = 0;
  let reps = 0;
  for (const ex of workout.exercises || []) {
    for (const s of ex.sets || []) {
      if (!s.completed || !Number(s.reps)) continue;
      sets += 1;
      reps += Number(s.reps);
      const kg = Number(s.kg);
      if (kg > 0 && ex.loadType !== "assisted") volume += kg * Number(s.reps);
    }
  }
  return { volume: Math.round(volume), sets, reps };
}

export function durationMin(workout) {
  if (!workout.startedAt) return null;
  const end = workout.finishedAt ? new Date(workout.finishedAt).getTime() : Date.now();
  const start = new Date(workout.startedAt).getTime();
  return Math.max(1, Math.round((end - start) / 60000));
}

export function supersetPartnerIndex(exercises, index) {
  const tag = exercises[index]?.superset;
  if (!tag) return null;
  const group = [];
  exercises.forEach((e, i) => {
    if (e.superset === tag) group.push(i);
  });
  if (group.length < 2) return null;
  const pos = group.indexOf(index);
  return group[(pos + 1) % group.length];
}

export function afterSetAction(exercises, exIndex) {
  const incomplete = (e) => (e.sets || []).some((s) => !s.completed);
  const partner = supersetPartnerIndex(exercises, exIndex);
  const later = exercises.findIndex((e, i) => i > exIndex && incomplete(e));
  const earlier = exercises.findIndex((e, i) => i < exIndex && incomplete(e));
  const moreHere = incomplete(exercises[exIndex]);
  const partnerOpen = partner != null && incomplete(exercises[partner]);

  if (partnerOpen) return { type: "goto", index: partner };
  if (moreHere) return { type: "stay" };
  if (later >= 0) return { type: "goto", index: later };
  if (earlier >= 0) return { type: "goto", index: earlier };
  return { type: "all-done" };
}

export function e1rmSeries(workouts, exerciseName) {
  const points = [];
  const done = (workouts || [])
    .filter((w) => w.status === "done")
    .sort((a, b) => String(a.finishedAt || a.date).localeCompare(String(b.finishedAt || b.date)));
  for (const w of done) {
    let best = 0;
    let bestSet = null;
    for (const ex of w.exercises || []) {
      if (norm(ex.name) !== norm(exerciseName) && ex.exerciseId !== exerciseName) continue;
      for (const s of ex.sets || []) {
        if (!s.completed || !Number(s.reps) || !Number(s.kg)) continue;
        const e = e1rm(s.kg, s.reps);
        if (e > best) {
          best = e;
          bestSet = s;
        }
      }
    }
    if (bestSet) {
      points.push({
        date: w.date,
        e1rm: Math.round(best * 10) / 10,
        kg: Number(bestSet.kg),
        reps: Number(bestSet.reps),
      });
    }
  }
  return points;
}

export function bestLifts(workouts) {
  const map = new Map();
  const sessions = new Map();
  for (const w of workouts || []) {
    if (w.status !== "done") continue;
    for (const ex of w.exercises || []) {
      const key = norm(ex.name);
      let saw = false;
      for (const s of ex.sets || []) {
        if (!s.completed || !Number(s.reps) || !Number(s.kg)) continue;
        saw = true;
        const e = e1rm(s.kg, s.reps);
        const cur = map.get(key);
        if (!cur || e > cur.e1rm + 0.05) {
          map.set(key, {
            name: ex.name,
            kg: Number(s.kg),
            reps: Number(s.reps),
            e1rm: e,
            date: w.date,
            improved: !!cur,
            loadType: ex.loadType || (Number(s.kg) < 0 ? "assisted" : null),
          });
        }
      }
      if (saw) sessions.set(key, (sessions.get(key) || 0) + 1);
    }
  }
  return [...map.values()].sort((a, b) => b.e1rm - a.e1rm);
}

export function prsThisWeek(workouts, iso) {
  const start = startOfWeekMonday(iso);
  const names = [];
  for (const w of workouts || []) {
    if (w.status !== "done" || w.date < start || w.date > iso) continue;
    for (const pr of w.prs || []) {
      if (!names.includes(pr.name)) names.push(pr.name);
    }
  }
  return names;
}

export function sessionBlock(workout) {
  const lines = [];
  const vol = volumeOf(workout);
  const mins = workout.finishedAt ? durationMin(workout) : null;
  const extra = [mins ? `${mins} min` : null, vol.volume ? `volume ${fmtInt(vol.volume)} kg` : null]
    .filter(Boolean)
    .join(", ");
  lines.push(`${formatShort(workout.date)}, ${workout.dayName}${extra ? ` (${extra})` : ""}`);
  for (const ex of workout.exercises || []) {
    const done = (ex.sets || []).filter((s) => s.completed && s.reps);
    if (!done.length) continue;
    lines.push(`- ${ex.name}: ${done.map((s) => fmtSet(s.kg, s.reps, ex.loadType)).join(", ")}`);
  }
  return lines;
}

export function checkinText(info) {
  const lines = [];
  lines.push(`Week ${info.week} check-in${info.partial ? " (so far)" : ""}`);
  lines.push(`${info.phase} phase`);
  lines.push(info.range);
  lines.push("");
  lines.push(`Workouts: ${info.workoutsDone}/${info.workoutsGoal}`);
  if (info.weightAvg == null) lines.push("Average weight: none logged");
  else {
    const delta = info.weightDelta == null ? "" : ` (${formatDelta(info.weightDelta)} kg vs last week)`;
    lines.push(`Average weight: ${fmt1(info.weightAvg)} kg${delta}`);
  }
  if (info.waist == null) lines.push("Waist: none logged");
  else {
    const delta = info.waistDelta == null ? "" : ` (${formatDelta(info.waistDelta)} cm)`;
    lines.push(`Waist: ${fmt1(info.waist)} cm${delta}`);
  }
  lines.push(info.kcalAvg == null ? "Avg calories: none logged" : `Avg calories: ${fmtInt(info.kcalAvg)}`);
  lines.push(info.proteinAvg == null ? "Avg protein: none logged" : `Avg protein: ${Math.round(info.proteinAvg)} g`);
  lines.push(`Days on target: ${info.onTarget}/${info.targetDays}`);
  lines.push(info.prs && info.prs.length ? `PRs: ${info.prs.join(", ")}` : "PRs: none");
  lines.push("");
  lines.push("Sessions:");
  if (!info.sessions || !info.sessions.length) lines.push("No workouts logged this week.");
  else lines.push(...info.sessions);
  if (info.note) {
    lines.push("");
    lines.push("Note:");
    lines.push(info.note);
  }
  return lines.join("\n");
}

export function chartPoints(values, width, height, padX, padY, minMax) {
  const nums = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!nums.length) return [];
  let min = minMax ? minMax.min : Math.min(...nums);
  let max = minMax ? minMax.max : Math.max(...nums);
  if (!minMax) {
    const span = max - min || 1;
    min -= span * 0.3;
    max += span * 0.3;
  }
  const span = max - min || 1;
  const n = values.length;
  return values.map((v, i) => {
    if (typeof v !== "number" || Number.isNaN(v)) return null;
    const x = n === 1 ? width / 2 : padX + (i / (n - 1)) * (width - padX * 2);
    const y = padY + (1 - (v - min) / span) * (height - padY * 2);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
}

export function sharedMinMax(arrays) {
  const nums = arrays.flat().filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!nums.length) return null;
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  const span = max - min || 1;
  return { min: min - span * 0.3, max: max + span * 0.3 };
}

export function pointsAttr(points) {
  return points
    .filter(Boolean)
    .map((p) => `${p[0]},${p[1]}`)
    .join(" ");
}

export function mergePlanChanges(plan, changes) {
  let changed = false;
  for (const change of changes || []) {
    for (const ph of change.add_phases || []) {
      if (!ph || !ph.name || !ph.start || !ph.end) continue;
      const exists = plan.phases.some((p) => p.start === ph.start && norm(p.name) === norm(ph.name));
      if (exists) continue;
      plan.phases.push({
        id: `${slug(ph.name)}-${ph.start}`,
        name: ph.name,
        start: ph.start,
        end: ph.end,
        setMod: ph.set_mod || "as-written",
        rir: String(ph.rir ?? "1"),
        conditioning: ph.conditioning || "",
      });
      changed = true;
    }
  }
  if (changed) {
    plan.phases.sort((a, b) => a.start.localeCompare(b.start));
  }
  return changed;
}

export function continuePhase(plan, iso) {
  const phases = [...plan.phases].sort((a, b) => a.start.localeCompare(b.start));
  const last = phases[phases.length - 1];
  const start = addDays(last.end < iso ? iso : last.end, last.end < iso ? 0 : 1);
  const end = addDays(start, 27);
  const setMod = last.setMod === "half" ? "as-written" : last.setMod;
  plan.phases.push({
    id: `continue-${start}`,
    name: "Continue",
    start,
    end,
    setMod,
    rir: last.rir,
    conditioning: "Same training rules as the previous block until you change them.",
  });
  return plan;
}

export function exerciseCatalog(plan, workouts) {
  const map = new Map();
  for (const day of plan.days || []) {
    for (const ex of day.exercises || []) {
      if (!map.has(ex.id)) map.set(ex.id, ex.name);
    }
  }
  for (const w of workouts || []) {
    for (const ex of w.exercises || []) {
      const id = ex.exerciseId || slug(ex.name);
      if (!map.has(id)) map.set(id, ex.name);
    }
  }
  return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function liftById(plan, workouts, id) {
  if (!id) return null;
  const cat = exerciseCatalog(plan, workouts);
  return cat.find((e) => e.id === id) || null;
}

export function completedCount(exercise) {
  return (exercise.sets || []).filter((s) => s.completed).length;
}

export function firstOpenSet(exercise) {
  return (exercise.sets || []).findIndex((s) => !s.completed);
}

export function workoutDoneCount(workouts, iso) {
  return weekDots(workouts, iso).filter((d) => d.done).length;
}

export function workoutFromHistorySeed(entry, plan) {
  const day = (plan?.days || []).find((item) => item.id === entry.day_id);
  const exercises = (entry.exercises || []).map((raw) => {
    const planned = day?.exercises.find((item) => norm(item.name) === norm(raw.name));
    const loadType = raw.load_type || planned?.loadType || null;
    const sets = (raw.sets || []).map((pair) => {
      const kg = Array.isArray(pair) ? Number(pair[0]) : Number(pair.kg);
      const reps = Array.isArray(pair) ? Number(pair[1]) : Number(pair.reps);
      return { kg, reps, completed: true, prevKg: null, prevReps: null };
    });
    return {
      exerciseId: planned?.id || slug(raw.name),
      name: planned?.name || raw.name,
      superset: null,
      slot: null,
      targetSets: planned?.sets || sets.length,
      repsMin: planned?.repsMin ?? 8,
      repsMax: planned?.repsMax ?? 12,
      rir: "1",
      loadType,
      sets,
    };
  });
  return {
    id: entry.id,
    date: entry.date,
    dayId: entry.day_id,
    dayName: entry.day_name || day?.name || entry.day_id,
    phaseName: "Strong",
    source: "strong",
    startedAt: `${entry.date}T08:00:00`,
    finishedAt: `${entry.date}T09:00:00`,
    status: "done",
    logIndex: 0,
    exercises,
    prs: [],
    advice: [],
    note: "Imported from Strong",
  };
}

export function mergeHistorySeed(workouts, seed, appliedIds = [], plan) {
  const applied = new Set(appliedIds || []);
  const next = [...(workouts || [])];
  const ids = new Set(next.map((workout) => workout.id));
  const added = [];
  for (const entry of seed || []) {
    if (!entry || !entry.id) continue;
    if (applied.has(entry.id) || ids.has(entry.id)) {
      applied.add(entry.id);
      continue;
    }
    const session = entry.status === "done" && entry.dayId ? entry : workoutFromHistorySeed(entry, plan);
    next.push(session);
    ids.add(session.id);
    applied.add(entry.id);
    added.push(entry.id);
  }
  return { workouts: next, appliedIds: [...applied], added };
}
