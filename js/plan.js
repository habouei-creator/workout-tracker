// Houman's 8-week shred, Nov 2 to Dec 27, 2026.
// Superset letter is stored on every exercise in that group.
// A letter used once is a straight set. A letter used twice is a superset:
// the first move has no rest, the second carries the rest after the pair.
// Phase rules add sets only on A moves, or A and B moves. See js/logic.js.

export const SEED_PLAN = {
  id: "current",
  name: "8-Week Shred",
  seedVersion: 1,
  blockStart: "2026-11-02",
  blockEnd: "2026-12-27",
  weeks: 8,
  phases: [
    {
      id: "build",
      name: "Build",
      start: "2026-11-02",
      end: "2026-11-15",
      setMod: "as-written",
      rir: "2",
      conditioning: "Incline walk 3 times this week, about 15 minutes.",
    },
    {
      id: "push",
      name: "Push",
      start: "2026-11-16",
      end: "2026-11-29",
      setMod: "plus-a",
      rir: "1",
      conditioning: "Bike intervals twice and incline walks twice. Skip intervals on leg day if your legs are cooked.",
    },
    {
      id: "deload",
      name: "Deload",
      start: "2026-11-30",
      end: "2026-12-06",
      setMod: "half",
      rir: "3",
      conditioning: "Easy walk 3 times. Keep the weights and do fewer sets.",
    },
    {
      id: "peak",
      name: "Peak",
      start: "2026-12-07",
      end: "2026-12-27",
      setMod: "plus-ab",
      rir: "0-1",
      conditioning: "Bike intervals 3 times and one easy walk.",
    },
  ],
  schedule: {
    0: null,
    1: "push-a",
    2: "pull-a",
    3: "legs-a",
    4: "push-b",
    5: "pull-b",
    6: "legs-b",
  },
  days: [
    {
      id: "push-a",
      name: "Push A",
      weekday: "Monday",
      focus: "Heavier day. Chest and triceps, then the core finisher.",
      exercises: [
        ex("machine-chest-press", "Machine chest press", 3, 6, 10, 0, "A"),
        ex("tricep-pushdown", "Tricep pushdown (single cable)", 3, 10, 12, 75, "A"),
        ex("cable-chest-fly", "Cable chest fly", 3, 12, 15, 0, "B"),
        ex("db-lateral-raise", "DB lateral raise", 3, 12, 15, 60, "B"),
        ex("db-shrug", "DB shrug", 3, 10, 12, 60, "C"),
        ex("hanging-leg-raise", "Hanging leg raise", 3, 10, 15, 0, "D"),
        ex("cable-crunch", "Cable crunch", 3, 12, 15, 45, "D"),
      ],
    },
    {
      id: "pull-a",
      name: "Pull A",
      weekday: "Tuesday",
      focus: "Heavier day. Back width and thickness, then biceps.",
      exercises: [
        ex("lat-pulldown", "Lat pulldown", 3, 6, 10, 0, "A"),
        ex("seated-cable-row", "Seated cable row", 3, 8, 10, 90, "A"),
        ex("bent-over-cable-row", "Bent-over cable row", 3, 10, 12, 0, "B"),
        ex("hammer-curl", "Hammer curl (cable)", 3, 10, 12, 60, "B"),
        ex("bicep-curl", "Bicep curl (cable)", 3, 12, 15, 0, "C"),
        ex("cable-lateral-raise", "Cable lateral raise", 3, 12, 15, 60, "C"),
      ],
    },
    {
      id: "legs-a",
      name: "Legs A",
      weekday: "Wednesday",
      focus: "Hinge focus. Romanian deadlift goes first while you are fresh.",
      exercises: [
        ex("db-rdl", "DB Romanian deadlift", 3, 8, 10, 90, "A"),
        ex("goblet-squat", "Goblet squat (kettlebell)", 3, 10, 12, 75, "B"),
        ex("leg-extension", "Leg extension", 3, 12, 15, 0, "C"),
        ex("lying-leg-curl", "Lying leg curl", 3, 10, 12, 60, "C"),
        ex("hip-thrust", "Barbell hip thrust", 3, 8, 12, 75, "D"),
        ex("standing-calf-raise", "Standing calf raise", 3, 12, 15, 0, "E"),
        ex("seated-calf-raise", "Seated calf raise", 3, 12, 15, 45, "E"),
      ],
    },
    {
      id: "push-b",
      name: "Push B",
      weekday: "Thursday",
      focus: "Pump day. Lighter weights, more reps, shorter rest, then core.",
      exercises: [
        ex("machine-chest-press", "Machine chest press", 3, 12, 15, 0, "A"),
        ex("cable-chest-fly", "Cable chest fly", 3, 15, 15, 60, "A"),
        ex("db-lateral-raise", "DB lateral raise", 3, 15, 20, 0, "B"),
        ex("tricep-pushdown", "Tricep pushdown (single cable)", 3, 15, 15, 45, "B"),
        ex("db-shrug", "DB shrug", 3, 12, 15, 45, "C"),
        ex("hanging-leg-raise", "Hanging leg raise", 3, 10, 15, 0, "D"),
        ex("cable-crunch", "Cable crunch", 3, 15, 15, 45, "D"),
      ],
    },
    {
      id: "pull-b",
      name: "Pull B",
      weekday: "Friday",
      focus: "Pump day. Same movements in higher rep ranges with tight rest.",
      exercises: [
        ex("seated-cable-row", "Seated cable row", 3, 12, 15, 0, "A"),
        ex("lat-pulldown", "Lat pulldown", 3, 12, 15, 60, "A"),
        ex("bent-over-cable-row", "Bent-over cable row", 3, 12, 15, 0, "B"),
        ex("bicep-curl", "Bicep curl (cable)", 3, 12, 15, 45, "B"),
        ex("hammer-curl", "Hammer curl (cable)", 3, 15, 15, 0, "C"),
        ex("cable-lateral-raise", "Cable lateral raise", 3, 15, 20, 45, "C"),
      ],
    },
    {
      id: "legs-b",
      name: "Legs B",
      weekday: "Saturday",
      focus: "Squat focus. Leg press goes first.",
      exercises: [
        ex("leg-press", "Leg press", 3, 10, 12, 90, "A"),
        ex("hip-thrust", "Barbell hip thrust", 3, 10, 12, 75, "B"),
        ex("leg-extension", "Leg extension", 3, 15, 15, 0, "C"),
        ex("lying-leg-curl", "Lying leg curl", 3, 12, 15, 60, "C"),
        ex("goblet-squat", "Goblet squat (kettlebell)", 2, 15, 15, 60, "D"),
        ex("standing-calf-raise", "Standing calf raise", 3, 15, 20, 0, "E"),
        ex("seated-calf-raise", "Seated calf raise", 3, 15, 20, 45, "E"),
      ],
    },
  ],
};

function ex(id, name, sets, repsMin, repsMax, restSec, superset) {
  return { id, name, sets, repsMin, repsMax, restSec, superset };
}

export function freshPlan() {
  return JSON.parse(JSON.stringify(SEED_PLAN));
}

export const SAFE_SWAPS = {
  "machine-chest-press": ["Neutral-grip machine press", "DB floor press", "Pec deck", "Cable chest fly"],
  "cable-chest-fly": ["Pec deck", "Machine chest press", "DB floor press", "Cable press (mid chest)"],
  "db-lateral-raise": ["Cable lateral raise", "Machine lateral raise"],
  "cable-lateral-raise": ["DB lateral raise", "Machine lateral raise"],
  "tricep-pushdown": ["Rope pushdown", "Cable kickback", "Single-arm pushdown"],
  "db-shrug": ["Cable shrug", "Machine shrug"],
  "hanging-leg-raise": ["Lying leg raise", "Dead bug", "Reverse crunch"],
  "cable-crunch": ["Dead bug", "Reverse crunch", "Plank"],
  "lat-pulldown": ["Neutral-grip pulldown", "Straight-arm pulldown", "Chest-supported row"],
  "seated-cable-row": ["Chest-supported row", "Single-arm cable row", "Bent-over cable row"],
  "bent-over-cable-row": ["Chest-supported row", "Seated cable row", "Single-arm cable row"],
  "hammer-curl": ["Bicep curl (cable)", "Rope hammer curl", "DB hammer curl"],
  "bicep-curl": ["Hammer curl (cable)", "Cable curl", "DB curl"],
  "db-rdl": ["Cable pull-through", "Dumbbell hip hinge", "Back extension"],
  "goblet-squat": ["Hack squat", "Belt squat", "Smith squat", "Leg press"],
  "leg-extension": ["Single-leg extension", "Terminal knee extension"],
  "lying-leg-curl": ["Seated leg curl", "Swiss ball leg curl"],
  "hip-thrust": ["Glute bridge", "Machine hip thrust", "Cable pull-through"],
  "standing-calf-raise": ["Leg press calf raise", "Seated calf raise", "Single-leg calf raise"],
  "seated-calf-raise": ["Standing calf raise", "Leg press calf raise"],
  "leg-press": ["Hack squat", "Belt squat", "Smith squat"],
};

export const WEEKDAYS = [
  { key: "1", label: "Monday" },
  { key: "2", label: "Tuesday" },
  { key: "3", label: "Wednesday" },
  { key: "4", label: "Thursday" },
  { key: "5", label: "Friday" },
  { key: "6", label: "Saturday" },
  { key: "0", label: "Sunday" },
];

export const SET_MODS = [
  { id: "as-written", label: "As written" },
  { id: "plus-a", label: "Plus 1 set on A moves" },
  { id: "plus-ab", label: "Plus 1 set on A and B moves" },
  { id: "half", label: "Half the sets (rounded)" },
];
