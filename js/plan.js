// Houman's 8-week shred, Nov 2 to Dec 27, 2026.
// Superset letter is stored on every exercise in that group.
// A letter used once is a straight set. A letter used twice is a superset.
// Phase rules add sets only on A moves, or A and B moves. See js/logic.js.

export const SEED_PLAN = {
  id: "current",
  name: "8-Week Shred",
  seedVersion: 2,
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
      setMod: "as-written",
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
      setMod: "as-written",
      rir: "0-1",
      conditioning: "Bike intervals 3 times and one easy walk.",
    },
  ],
  schedule: {
    0: null,
    1: "push",
    2: "pull",
    3: "legs",
    4: "push",
    5: "pull",
    6: "legs",
  },
  days: [
    {
      id: "push",
      name: "Push",
      focus: "Straight sets. Arms, chest, then core.",
      exercises: [
        ex("shrug-dumbbell", "Shrug (Dumbbell)", 12, 15, "A"),
        ex("preacher-curl-machine", "Preacher Curl (Machine)", 10, 12, "B"),
        ex("tricep-arm-side", "Tricep Arm Side", 10, 12, null),
        ex("chest-fly", "Chest Fly", 10, 12, null),
        ex("chest-press-band", "Chest Press (Band)", 10, 12, null, "added"),
        ex("crunch-machine", "Crunch (Machine)", 20, 25, null),
        ex("core-3x-set", "Core 3X Set", 20, 25, null, "assisted"),
      ],
    },
    {
      id: "pull",
      name: "Pull",
      focus: "Straight sets. Back, then arms.",
      exercises: [
        ex("lat-pulldown-cable", "Lat Pulldown (Cable)", 10, 12, "A"),
        ex("seated-row-cable", "Seated Row (Cable)", 10, 12, "B"),
        ex("hammer-curl-cable", "Hammer Curl (Cable)", 12, 15, null),
        ex("triceps-extension", "Triceps Extension", 10, 12, null),
        ex("bicep-curl-cable", "Bicep Curl (Cable)", 10, 12, null),
        ex("bent-over-row-cable", "Bent over row (cable)", 10, 12, null),
        ex("lateral-raise-cable", "Lateral Raise (Cable)", 10, 12, null),
      ],
    },
    {
      id: "legs",
      name: "Legs",
      focus: "Straight sets. Squat first, then the rest.",
      exercises: [
        ex("squat-machine", "Squat (Machine)", 8, 12, "A"),
        ex("goblet-squat-kettlebell", "Goblet Squat (Kettlebell)", 10, 12, "B"),
        ex("leg-extension-machine", "Leg Extension (Machine)", 10, 12, null),
        ex("standing-calf-raise-dumbbell", "Standing Calf Raise (Dumbbell)", 12, 15, null),
        ex("lying-leg-curl-machine", "Lying Leg Curl (Machine)", 8, 12, null),
        ex("hip-thrust-barbell", "Hip Thrust (Barbell)", 8, 12, null),
        ex("seated-calf-raise-plate", "Seated Calf Raise (Plate Loaded)", 12, 15, null),
      ],
    },
  ],
};

function ex(id, name, repsMin, repsMax, group, loadType) {
  return {
    id,
    name,
    sets: 3,
    repsMin,
    repsMax,
    superset: group || null,
    loadType: loadType || null,
  };
}

export function upgradePlan(stored) {
  const fresh = freshPlan();
  if (!stored || !stored.days || !stored.phases) return fresh;
  if ((stored.seedVersion || 1) >= fresh.seedVersion) return stored;
  const extra = (stored.phases || []).filter((phase) => !fresh.phases.some((item) => item.id === phase.id));
  fresh.phases = fresh.phases.concat(extra);
  return fresh;
}

export function freshPlan() {
  return JSON.parse(JSON.stringify(SEED_PLAN));
}

export const SAFE_SWAPS = {
  "shrug-dumbbell": ["Cable shrug", "Machine shrug"],
  "preacher-curl-machine": ["Bicep Curl (Cable)", "Hammer Curl (Cable)", "DB curl"],
  "tricep-arm-side": ["Rope pushdown", "Cable kickback", "Triceps Extension"],
  "chest-fly": ["Pec deck", "Cable chest fly", "DB floor press"],
  "chest-press-band": ["Chest Fly", "Pec deck", "DB floor press", "Neutral-grip machine press"],
  "crunch-machine": ["Cable crunch", "Dead bug", "Reverse crunch"],
  "core-3x-set": ["Dead bug", "Lying leg raise", "Reverse crunch", "Plank"],
  "lat-pulldown-cable": ["Neutral-grip pulldown", "Straight-arm pulldown", "Chest-supported row"],
  "seated-row-cable": ["Chest-supported row", "Single-arm cable row", "Bent over row (cable)"],
  "hammer-curl-cable": ["Bicep Curl (Cable)", "DB hammer curl"],
  "triceps-extension": ["Rope pushdown", "Cable kickback", "Tricep Arm Side"],
  "bicep-curl-cable": ["Hammer Curl (Cable)", "DB curl"],
  "bent-over-row-cable": ["Chest-supported row", "Seated Row (Cable)", "Single-arm cable row"],
  "lateral-raise-cable": ["DB lateral raise", "Machine lateral raise"],
  "squat-machine": ["Hack squat", "Belt squat", "Smith squat", "Goblet Squat (Kettlebell)"],
  "goblet-squat-kettlebell": ["Hack squat", "Belt squat", "Smith squat", "Squat (Machine)"],
  "leg-extension-machine": ["Single-leg extension", "Terminal knee extension"],
  "standing-calf-raise-dumbbell": ["Seated Calf Raise (Plate Loaded)", "Single-leg calf raise"],
  "lying-leg-curl-machine": ["Seated leg curl", "Swiss ball leg curl"],
  "hip-thrust-barbell": ["Glute bridge", "Machine hip thrust", "Cable pull-through"],
  "seated-calf-raise-plate": ["Standing Calf Raise (Dumbbell)", "Single-leg calf raise"],
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
  { id: "as-written", label: "3 sets" },
  { id: "half", label: "Deload, 3 sets, about 10% lighter" },
];
