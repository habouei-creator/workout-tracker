const KEY = "wt-coach-cache";

export function normalizeCoach(data) {
  const d = data && typeof data === "object" ? data : {};
  const targets = d.targets && typeof d.targets === "object" ? d.targets : {};
  return {
    version: d.version || 1,
    targets: {
      kcal_min: numberOr(targets.kcal_min, 2400),
      kcal_max: numberOr(targets.kcal_max, 2600),
      protein_g: numberOr(targets.protein_g, 200),
    },
    food_days: Array.isArray(d.food_days) ? d.food_days : [],
    notes: Array.isArray(d.notes) ? d.notes : [],
    exercise_overrides: Array.isArray(d.exercise_overrides) ? d.exercise_overrides : [],
    plan_changes: Array.isArray(d.plan_changes) ? d.plan_changes : [],
  };
}

function numberOr(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function readCoachCache() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;
    return { data: normalizeCoach(parsed.data), at: parsed.at || null };
  } catch {
    return null;
  }
}

export async function fetchCoach() {
  const url = `./data/coach.json?t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = normalizeCoach(await res.json());
    try {
      localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data }));
    } catch {
      /* storage full or private mode */
    }
    return { data, source: "network" };
  } catch (err) {
    const cached = readCoachCache();
    if (cached) return { data: cached.data, source: "cache", error: String(err.message || err) };
    return { data: normalizeCoach(null), source: "empty", error: String(err.message || err) };
  }
}
