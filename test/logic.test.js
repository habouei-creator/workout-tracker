import test from "node:test";
import assert from "node:assert/strict";
import { freshPlan } from "../js/plan.js";
import { normalizeCoach } from "../js/coach.js";
import {
  addDays,
  phaseForDate,
  weekOfBlock,
  phaseLabel,
  prescribedSets,
  resolveDay,
  scheduledDayId,
  nextPhotoDate,
  isOnTarget,
  daysOnTarget,
  createWorkout,
  finishWorkout,
  sessionResult,
  progressionAdvice,
  afterSetAction,
  e1rm,
  isBannedExercise,
  checkinText,
  weekOfBlock as week,
  startOfWeekMonday,
  trailingAverage,
  weekWeightDelta,
} from "../js/logic.js";

const plan = freshPlan();

test("Nov 21 2026 is Push phase week 3 and Legs B", () => {
  const iso = "2026-11-21";
  const { phase, status } = phaseForDate(plan, iso);
  assert.equal(phase.name, "Push");
  assert.equal(status, "in");
  assert.equal(weekOfBlock(plan, iso).week, 3);
  assert.equal(phaseLabel(plan, iso), "Push phase · week 3 of 8");
  assert.equal(scheduledDayId(plan, iso), "legs-b");
});

test("phase boundaries", () => {
  assert.equal(phaseForDate(plan, "2026-11-02").phase.name, "Build");
  assert.equal(weekOfBlock(plan, "2026-11-02").week, 1);
  assert.equal(phaseForDate(plan, "2026-11-15").phase.name, "Build");
  assert.equal(weekOfBlock(plan, "2026-11-15").week, 2);
  assert.equal(phaseForDate(plan, "2026-11-16").phase.name, "Push");
  assert.equal(phaseForDate(plan, "2026-11-30").phase.name, "Deload");
  assert.equal(weekOfBlock(plan, "2026-11-30").week, 5);
  assert.equal(phaseForDate(plan, "2026-12-06").phase.name, "Deload");
  assert.equal(phaseForDate(plan, "2026-12-07").phase.name, "Peak");
  assert.equal(weekOfBlock(plan, "2026-12-07").week, 6);
  assert.equal(weekOfBlock(plan, "2026-12-27").week, 8);
  assert.equal(phaseForDate(plan, "2026-12-27").status, "in");
  assert.equal(phaseForDate(plan, "2026-12-28").status, "after");
  assert.equal(weekOfBlock(plan, "2026-12-28").week, 9);
});

test("schedule is the PPL split", () => {
  assert.equal(scheduledDayId(plan, "2026-11-02"), "push-a");
  assert.equal(scheduledDayId(plan, "2026-11-03"), "pull-a");
  assert.equal(scheduledDayId(plan, "2026-11-04"), "legs-a");
  assert.equal(scheduledDayId(plan, "2026-11-05"), "push-b");
  assert.equal(scheduledDayId(plan, "2026-11-06"), "pull-b");
  assert.equal(scheduledDayId(plan, "2026-11-07"), "legs-b");
  assert.equal(scheduledDayId(plan, "2026-11-08"), null);
});

test("push phase adds a set only on A moves", () => {
  const day = resolveDay(plan, "legs-b", "2026-11-21", []);
  const press = day.exercises.find((e) => e.id === "leg-press");
  const thrust = day.exercises.find((e) => e.id === "hip-thrust");
  const curl = day.exercises.find((e) => e.name === "Lying leg curl");
  assert.equal(press.sets, 4);
  assert.equal(thrust.sets, 3);
  assert.equal(curl.sets, 3);
  assert.equal(press.slot, null);
  assert.equal(day.exercises.find((e) => e.name === "Leg extension").slot, "C1");
  assert.equal(curl.slot, "C2");
  assert.equal(day.exercises.find((e) => e.name === "Lying leg curl").slot, "C2");
  assert.equal(press.rir, "1");
});

test("deload halves sets", () => {
  assert.equal(prescribedSets(3, "A", "half"), 2);
  assert.equal(prescribedSets(2, "D", "half"), 1);
  const day = resolveDay(plan, "push-a", "2026-12-02", []);
  assert.equal(day.phase.name, "Deload");
  assert.equal(day.exercises[0].sets, 2);
});

test("peak adds a set on A and B", () => {
  const day = resolveDay(plan, "push-a", "2026-12-10", []);
  assert.equal(day.exercises[0].sets, 4);
  assert.equal(day.exercises[2].sets, 4);
  assert.equal(day.exercises[4].sets, 3);
  assert.equal(day.exercises[0].rir, "0-1");
});

test("coach override replaces sets after the phase rule", () => {
  const day = resolveDay(plan, "legs-b", "2026-11-21", [
    {
      day: "Legs B",
      exercise: "Leg press",
      sets: 5,
      rir: "2",
      applies_from: "2026-11-16",
      applies_to: "2026-11-29",
    },
  ]);
  const press = day.exercises.find((e) => e.name === "Leg press");
  assert.equal(press.sets, 5);
  assert.equal(press.rir, "2");
});

test("banned swap names", () => {
  assert.equal(isBannedExercise("Barbell bench press"), true);
  assert.equal(isBannedExercise("Overhead press"), true);
  assert.equal(isBannedExercise("Dips"), true);
  assert.equal(isBannedExercise("Chest dips"), true);
  assert.equal(isBannedExercise("Hack squat"), false);
  assert.equal(isBannedExercise("DB floor press"), false);
  assert.equal(isBannedExercise("Machine chest press"), false);
});

test("photo sundays every 14 days from Nov 29", () => {
  assert.equal(nextPhotoDate("2026-11-21"), "2026-11-29");
  assert.equal(nextPhotoDate("2026-11-29"), "2026-11-29");
  assert.equal(nextPhotoDate("2026-11-30"), "2026-12-13");
  assert.equal(nextPhotoDate("2026-12-13"), "2026-12-13");
  assert.equal(nextPhotoDate("2026-12-14"), "2026-12-27");
  assert.equal(nextPhotoDate("2026-12-28"), "2027-01-10");
});

test("food on target is inclusive", () => {
  const targets = { kcal_min: 2400, kcal_max: 2600, protein_g: 200 };
  const ok = { meals: [{ kcal: 2400, protein_g: 200 }] };
  const edge = { meals: [{ kcal: 2600, protein_g: 200 }] };
  const low = { meals: [{ kcal: 2399, protein_g: 200 }] };
  const protein = { meals: [{ kcal: 2500, protein_g: 199 }] };
  assert.equal(isOnTarget(ok, targets), true);
  assert.equal(isOnTarget(edge, targets), true);
  assert.equal(isOnTarget(low, targets), false);
  assert.equal(isOnTarget(protein, targets), false);
  assert.equal(isOnTarget({ meals: [] }, targets), false);
  const days = [
    { date: "2026-11-16", meals: [{ kcal: 2500, protein_g: 210 }] },
    { date: "2026-11-17", meals: [{ kcal: 2000, protein_g: 150 }] },
  ];
  assert.deepEqual(daysOnTarget(days, targets, "2026-11-21"), { on: 1, total: 6 });
});

test("progression: top of range adds 2.5, two misses hold or drop", () => {
  const hit = { hitTop: true, miss: false, minWeight: 60 };
  assert.equal(progressionAdvice([hit]).kg, 62.5);
  assert.match(progressionAdvice([hit]).text, /\+2\.5 kg/);
  const miss = { hitTop: false, miss: true, minWeight: 60 };
  assert.equal(progressionAdvice([miss]), null);
  const two = progressionAdvice([miss, miss]);
  assert.equal(two.type, "hold");
  assert.match(two.text, /57\.5 kg/);
});

test("session result uses the prescribed rep range", () => {
  const ex = {
    targetSets: 3,
    repsMin: 10,
    repsMax: 12,
    sets: [
      { completed: true, kg: 100, reps: 12 },
      { completed: true, kg: 100, reps: 12 },
      { completed: true, kg: 100, reps: 12 },
    ],
  };
  assert.equal(sessionResult(ex).hitTop, true);
  ex.sets[2].reps = 9;
  assert.equal(sessionResult(ex).miss, true);
  assert.equal(sessionResult(ex).hitTop, false);
});

test("superset rest: no rest inside the pair, rest after", () => {
  const exercises = [
    { superset: "C", restSec: 0, sets: [{ completed: true }, { completed: false }] },
    { superset: "C", restSec: 60, sets: [{ completed: false }, { completed: false }] },
    { superset: "D", restSec: 60, sets: [{ completed: false }] },
  ];
  const jump = afterSetAction(exercises, 0);
  assert.deepEqual(jump, { type: "goto", index: 1 });
  exercises[1].sets[0].completed = true;
  const rest = afterSetAction(exercises, 1);
  assert.equal(rest.type, "rest");
  assert.equal(rest.seconds, 60);
  assert.equal(rest.thenIndex, 0);
});

test("e1rm epley", () => {
  assert.equal(e1rm(100, 1), 100);
  assert.ok(Math.abs(e1rm(100, 10) - 133.333) < 0.01);
});

test("create and finish a workout flags a PR on the second session", () => {
  const first = createWorkout(plan, [], "legs-b", "2026-11-14", []);
  first.exercises[0].sets.forEach((s) => {
    s.kg = 100;
    s.reps = 12;
    s.completed = true;
  });
  const done1 = finishWorkout(first, []);
  assert.equal(done1.prs.length, 0);
  const second = createWorkout(plan, [done1], "legs-b", "2026-11-21", []);
  assert.equal(second.exercises[0].targetSets, 4);
  assert.equal(second.exercises[0].sets[0].kg, 100);
  assert.equal(second.exercises[0].sets[0].prevReps, 12);
  second.exercises[0].sets.forEach((s) => {
    s.kg = 110;
    s.reps = 12;
    s.completed = true;
  });
  const done2 = finishWorkout(second, [done1]);
  assert.equal(done2.prs.length, 1);
  assert.equal(done2.prs[0].name, "Leg press");
  const up = done2.advice.find((a) => a.name === "Leg press");
  assert.equal(up.type, "up");
  assert.equal(up.kg, 112.5);
});

test("check-in text has no dash characters and includes sessions", () => {
  const text = checkinText({
    week: 3,
    phase: "Push",
    partial: true,
    range: "Mon, Nov 16 to Sat, Nov 21",
    workoutsDone: 1,
    workoutsGoal: 6,
    weightAvg: 94,
    weightDelta: -0.6,
    waist: null,
    waistDelta: null,
    kcalAvg: null,
    proteinAvg: null,
    onTarget: 0,
    targetDays: 6,
    prs: [],
    sessions: ["Sat, Nov 21, Legs B", "- Leg press: 140 x 10"],
    note: "Shoulder felt fine",
  });
  assert.match(text, /Week 3 check-in \(so far\)/);
  assert.match(text, /Workouts: 1\/6/);
  assert.match(text, /-0\.6 kg/);
  assert.match(text, /Leg press: 140 x 10/);
  assert.equal(text.includes("\u2014"), false);
  assert.equal(text.includes("\u2013"), false);
});

test("weight windows", () => {
  const weighins = [
    { date: "2026-11-10", kg: 95 },
    { date: "2026-11-11", kg: 94.5 },
    { date: "2026-11-17", kg: 94 },
    { date: "2026-11-21", kg: 93.6 },
  ];
  assert.equal(startOfWeekMonday("2026-11-21"), "2026-11-16");
  const avg = trailingAverage(weighins, "2026-11-21", 7);
  assert.ok(Math.abs(avg - 93.8) < 0.01);
  const delta = weekWeightDelta(weighins, "2026-11-21");
  assert.ok(delta < 0);
});

test("coach normalize fills defaults", () => {
  const c = normalizeCoach({ targets: { protein_g: 180 }, notes: [{ date: "2026-11-21", text: "Hi" }] });
  assert.equal(c.targets.kcal_min, 2400);
  assert.equal(c.targets.protein_g, 180);
  assert.equal(c.food_days.length, 0);
  assert.equal(c.notes[0].text, "Hi");
});

test("monday of the block is week 1 not week 0", () => {
  assert.equal(week(plan, "2026-11-02").week, 1);
  assert.equal(addDays("2026-11-02", 55), "2026-12-27");
});
