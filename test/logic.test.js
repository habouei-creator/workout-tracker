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
  weekDots,
  fmtSet,
  mergeHistorySeed,
  migrateWeighIns,
  deloadTarget,
  moveInList,
  bestSet,
  lastPerformance,
  adviceForExercise,
  canonicalName,
  e1rmSeries,
} from "../js/logic.js";
import { readFileSync } from "node:fs";
import { buildCheckin } from "../js/render.js";

const plan = freshPlan();

test("Nov 21 2026 is Push phase week 3 and Legs", () => {
  const iso = "2026-11-21";
  const { phase, status } = phaseForDate(plan, iso);
  assert.equal(phase.name, "Push");
  assert.equal(status, "in");
  assert.equal(weekOfBlock(plan, iso).week, 3);
  assert.equal(phaseLabel(plan, iso), "Push phase · week 3 of 8");
  assert.equal(scheduledDayId(plan, iso), "legs");
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
  assert.equal(scheduledDayId(plan, "2026-11-02"), "push");
  assert.equal(scheduledDayId(plan, "2026-11-03"), "pull");
  assert.equal(scheduledDayId(plan, "2026-11-04"), "legs");
  assert.equal(scheduledDayId(plan, "2026-11-05"), "push");
  assert.equal(scheduledDayId(plan, "2026-11-06"), "pull");
  assert.equal(scheduledDayId(plan, "2026-11-07"), "legs");
  assert.equal(scheduledDayId(plan, "2026-11-08"), null);
});

test("push phase adds a set only on A moves", () => {
  const day = resolveDay(plan, "legs", "2026-11-21", []);
  assert.equal(day.exercises[0].name, "Squat (Machine)");
  assert.equal(day.exercises[0].sets, 3);
  assert.equal(day.exercises[1].name, "Goblet Squat (Kettlebell)");
  assert.equal(day.exercises[1].sets, 3);
  assert.equal(day.exercises[0].slot, null);
  assert.equal(day.exercises[1].slot, null);
  assert.equal(day.exercises[0].rir, "1");
  assert.equal(day.exercises.find((e) => e.name === "Preacher Curl (Machine)"), undefined);
});

test("deload keeps 3 sets and suggests a lighter load", () => {
  assert.equal(prescribedSets(3), 3);
  const day = resolveDay(plan, "push", "2026-12-02", []);
  assert.equal(day.phase.name, "Deload");
  assert.equal(day.phase.setMod, "half");
  assert.ok(day.exercises.every((ex) => ex.sets === 3));
  const tip = deloadTarget(59, null);
  assert.match(tip.text, /10% lighter/);
  assert.equal(tip.kg, 53);
  assert.equal(deloadTarget(6, "added").kg, 5.5);
  assert.match(deloadTarget(-5, "assisted").text, /more assistance/);
});

test("peak adds a set on A and B", () => {
  const day = resolveDay(plan, "push", "2026-12-10", []);
  assert.equal(day.exercises[0].sets, 3);
  assert.equal(day.exercises[1].sets, 3);
  assert.equal(day.exercises[2].sets, 3);
  assert.equal(day.exercises[0].rir, "0-1");
});

test("coach override replaces sets after the phase rule", () => {
  const day = resolveDay(plan, "legs", "2026-11-21", [
    {
      day: "Legs",
      exercise: "Squat (Machine)",
      sets: 5,
      rir: "2",
      applies_from: "2026-11-16",
      applies_to: "2026-11-29",
    },
  ]);
  const squat = day.exercises.find((e) => e.name === "Squat (Machine)");
  assert.equal(squat.sets, 5);
  assert.equal(squat.rir, "2");
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

test("cable names reuse old history without band-style loads", () => {
  const workouts = [
    {
      id: "band",
      status: "done",
      date: "2026-11-17",
      dayId: "push",
      finishedAt: "2026-11-17T07:00:00",
      exercises: [
        {
          name: "Chest Press (Band)",
          loadType: "added",
          repsMin: 10,
          repsMax: 12,
          targetSets: 3,
          sets: [
            { kg: 6, reps: 12, completed: true },
            { kg: 6, reps: 12, completed: true },
            { kg: 6, reps: 12, completed: true },
          ],
        },
        {
          name: "Chest Fly",
          repsMin: 10,
          repsMax: 12,
          targetSets: 3,
          sets: [{ kg: 6, reps: 12, completed: true }],
        },
      ],
    },
  ];
  assert.equal(canonicalName("Chest Fly"), "Chest Fly (Cable)");
  assert.equal(canonicalName("Chest Press (Band)"), "Chest Press (Cable)");
  assert.equal(lastPerformance(workouts, "Chest Press (Cable)").best.kg, 6);
  assert.equal(lastPerformance(workouts, "Chest Fly (Cable)").sets[0].kg, 6);
  const advice = adviceForExercise(workouts, "push", "Chest Press (Cable)");
  assert.match(advice.text, /Try 8\.5 kg/);
  assert.equal(advice.text.includes("+8.5"), false);
  assert.equal(e1rmSeries(workouts, "Chest Fly (Cable)").length, 1);
  assert.equal(workouts[0].exercises[0].name, "Chest Press (Band)");
  assert.equal(workouts[0].exercises[1].name, "Chest Fly");
});

test("check-in top set is the highest e1rm, not the first set", () => {
  const sets = [
    { kg: 10, reps: 12, completed: true },
    { kg: 20, reps: 3, completed: true },
  ];
  assert.equal(e1rm(10, 12), 14);
  assert.equal(e1rm(20, 3), 22);
  assert.equal(bestSet(sets).kg, 20);
  const text = buildCheckin({
    today: "2026-11-23",
    plan,
    weighins: [],
    settings: { coachNoteDraft: "" },
    coach: { food_days: [], targets: { kcal_min: 2400, kcal_max: 2600, protein_g: 200 } },
    workouts: [
      {
        id: "w1",
        status: "done",
        date: "2026-11-23",
        dayName: "Push",
        startedAt: "2026-11-23T06:00:00",
        finishedAt: "2026-11-23T07:00:00",
        prs: [],
        exercises: [{ name: "Chest Fly", sets }],
      },
    ],
  });
  assert.match(text, /top 20 x 3/);
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

test("supersets move to the partner with no rest countdown", () => {
  const exercises = [
    { superset: "C", sets: [{ completed: true }, { completed: false }] },
    { superset: "C", sets: [{ completed: false }, { completed: false }] },
    { superset: "D", sets: [{ completed: false }] },
  ];
  assert.deepEqual(afterSetAction(exercises, 0), { type: "goto", index: 1 });
  exercises[1].sets[0].completed = true;
  assert.deepEqual(afterSetAction(exercises, 1), { type: "goto", index: 0 });
  exercises[0].sets[1].completed = true;
  exercises[1].sets[1].completed = true;
  assert.deepEqual(afterSetAction(exercises, 1), { type: "goto", index: 2 });
  assert.equal(JSON.stringify(afterSetAction(exercises, 0)).includes("rest"), false);
});

test("e1rm epley", () => {
  assert.equal(e1rm(100, 1), 100);
  assert.ok(Math.abs(e1rm(100, 10) - 133.333) < 0.01);
});

test("create and finish a workout flags a PR on the second session", () => {
  const first = createWorkout(plan, [], "legs", "2026-11-14", []);
  first.exercises[0].sets.forEach((s) => {
    s.kg = 100;
    s.reps = 12;
    s.completed = true;
  });
  const done1 = finishWorkout(first, []);
  assert.equal(done1.prs.length, 0);
  const second = createWorkout(plan, [done1], "legs", "2026-11-21", []);
  assert.equal(second.exercises[0].targetSets, 3);
  assert.equal(second.exercises[0].sets[0].kg, 100);
  assert.equal(second.exercises[0].sets[0].prevReps, 12);
  second.exercises[0].sets.forEach((s) => {
    s.kg = 110;
    s.reps = 12;
    s.completed = true;
  });
  const done2 = finishWorkout(second, [done1]);
  assert.equal(done2.prs.length, 1);
  assert.equal(done2.prs[0].name, "Squat (Machine)");
  const up = done2.advice.find((a) => a.name === "Squat (Machine)");
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
  assert.match(text, /-0\.6 lb/);
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

test("every week is Monday to Sunday with Sunday rest", () => {
  const ids = ["push", "pull", "legs", "push", "pull", "legs", null];
  for (const monday of ["2026-11-02", "2026-11-16", "2026-11-23", "2026-12-07"]) {
    ids.forEach((id, i) => {
      const date = addDays(monday, i);
      assert.equal(scheduledDayId(plan, date), id, date);
      assert.equal(startOfWeekMonday(date), monday, date);
    });
  }
  assert.equal(week(plan, "2026-11-02").week, 1);
  assert.equal(week(plan, "2026-11-08").week, 1);
  assert.equal(week(plan, "2026-11-09").week, 2);
  assert.equal(week(plan, "2026-11-22").week, 3);
  assert.equal(week(plan, "2026-11-23").week, 4);
  assert.equal(phaseLabel(plan, "2026-11-23"), "Push phase · week 4 of 8");

  const sundayDots = weekDots([{ status: "done", date: "2026-11-22" }], "2026-11-22");
  assert.deepEqual(
    sundayDots.map((d) => d.date),
    ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]
  );
  assert.equal(sundayDots.some((d) => d.done), false);
  assert.equal(sundayDots.every((d) => !d.future), true);

  const mondayDots = weekDots([{ status: "done", date: "2026-11-23" }], "2026-11-23");
  assert.equal(mondayDots[0].done, true);
  assert.equal(mondayDots.slice(1).every((d) => d.future && !d.done), true);

  const targets = { kcal_min: 2400, kcal_max: 2600, protein_g: 200 };
  const food = [{ date: "2026-11-16", meals: [{ kcal: 2500, protein_g: 210 }] }];
  assert.deepEqual(daysOnTarget(food, targets, "2026-11-16"), { on: 1, total: 1 });
  assert.deepEqual(daysOnTarget(food, targets, "2026-11-21"), { on: 1, total: 6 });
  assert.deepEqual(daysOnTarget(food, targets, "2026-11-22"), { on: 1, total: 7 });
  assert.deepEqual(daysOnTarget(food, targets, "2026-11-23"), { on: 0, total: 1 });

  const weighins = [
    { date: "2026-11-10", kg: 96 },
    { date: "2026-11-16", kg: 95 },
    { date: "2026-11-22", kg: 94 },
    { date: "2026-11-23", kg: 90 },
  ];
  assert.ok(Math.abs(weekWeightDelta(weighins, "2026-11-22") - (94.5 - 96)) < 0.001);
  assert.ok(Math.abs(weekWeightDelta(weighins, "2026-11-23") - (90 - 94.5)) < 0.001);
  assert.ok(Math.abs(trailingAverage(weighins, "2026-11-23", 7) - 92) < 0.001);
});

test("added and assisted loads format and progress differently", () => {
  assert.equal(fmtSet(6, 12, "added"), "+6 kg x 12");
  assert.equal(fmtSet(-5, 25, "assisted"), "-5 kg x 25");
  assert.equal(fmtSet(35, 12), "35 x 12");
  const assisted = { hitTop: true, miss: false, minWeight: -5, loadType: "assisted" };
  assert.equal(progressionAdvice([assisted]).kg, -2.5);
  assert.match(progressionAdvice([assisted]).text, /less assistance/);
  const added = { hitTop: true, miss: false, minWeight: 6, loadType: "added" };
  assert.equal(progressionAdvice([added]).kg, 8.5);
  assert.match(progressionAdvice([added]).text, /\+8\.5 kg/);
});

test("Strong history seed merges once and leaves other workouts", () => {
  const coach = JSON.parse(readFileSync(new URL("../data/coach.json", import.meta.url), "utf8"));
  const own = { id: "houman-own", status: "done", dayId: "push", exercises: [] };
  const first = mergeHistorySeed([own], coach.history_seed, [], plan);
  assert.equal(first.added.length, 3);
  assert.equal(first.workouts[0].id, "houman-own");
  const push = first.workouts.find((w) => w.id === "strong-push-2026-11-17");
  assert.equal(push.exercises[1].name, "Preacher Curl (Machine)");
  assert.equal(push.exercises.some((e) => e.name === "Machine chest press"), false);
  assert.equal(fmtSet(push.exercises[4].sets[0].kg, push.exercises[4].sets[0].reps, "added"), "+6 kg x 12");
  assert.equal(fmtSet(push.exercises[6].sets[0].kg, push.exercises[6].sets[0].reps, "assisted"), "-5 kg x 25");
  const legs = first.workouts.find((w) => w.id === "strong-legs-2026-11-19");
  assert.equal(legs.exercises.some((e) => e.name === "Squat (Machine)"), false);
  assert.equal(legs.exercises[0].name, "Goblet Squat (Kettlebell)");
  const again = mergeHistorySeed(first.workouts, coach.history_seed, first.appliedIds, plan);
  assert.equal(again.added.length, 0);
  assert.equal(again.workouts.length, first.workouts.length);
  const day = resolveDay(plan, "legs", "2026-11-21", []);
  assert.equal(day.exercises[0].name, "Squat (Machine)");
  assert.equal(day.exercises[0].repsMin, 8);
  assert.equal(day.exercises[0].repsMax, 12);
});

test("kg weigh-ins convert to lb once", () => {
  const first = migrateWeighIns([{ date: "2026-11-21", kg: 93.6, waistCm: 97 }]);
  assert.equal(first.changed, true);
  assert.equal(first.weighins[0].unit, "lb");
  assert.equal(first.weighins[0].lb, 206.4);
  assert.equal(first.weighins[0].kg, undefined);
  assert.equal(first.weighins[0].waistCm, 97);
  const second = migrateWeighIns(first.weighins);
  assert.equal(second.changed, false);
  assert.equal(second.weighins[0].lb, 206.4);
});

test("reorder keeps the exercises and can move one to the front", () => {
  const names = ["Lat Pulldown (Cable)", "Seated Row (Cable)", "Hammer Curl (Cable)"];
  const moved = moveInList(names, 2, -2);
  assert.deepEqual(moved, ["Hammer Curl (Cable)", "Lat Pulldown (Cable)", "Seated Row (Cable)"]);
  assert.deepEqual(names, ["Lat Pulldown (Cable)", "Seated Row (Cable)", "Hammer Curl (Cable)"]);
});

test("Sunday check-in covers Monday through Sunday", () => {
  const base = {
    plan,
    workouts: [],
    weighins: [],
    coach: { food_days: [], targets: { kcal_min: 2400, kcal_max: 2600, protein_g: 200 }, notes: [] },
    settings: { coachNoteDraft: "" },
  };
  const sunday = buildCheckin({ ...base, today: "2026-11-22" });
  assert.match(sunday, /^Week 3 check-in\n/);
  assert.match(sunday, /Mon, Nov 16 to Sun, Nov 22/);
  assert.equal(sunday.includes("so far"), false);
  const monday = buildCheckin({ ...base, today: "2026-11-23" });
  assert.match(monday, /Week 4 check-in \(so far\)/);
  assert.match(monday, /Mon, Nov 23 to Mon, Nov 23/);
});
