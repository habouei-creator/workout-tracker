# Workout Tracker

A personal workout and check-in app for Houman. It replaces Strong on his iPhone: install it from Safari with Add to Home Screen. There is no account, no backend, and no Apple Health connection. Workouts, weigh-ins, and waist measurements stay on the phone. Food and coach notes come from `data/coach.json` in this repo.

Live app: <https://habouei-creator.github.io/workout-tracker/>

## Install on iPhone

1. Open the live URL in Safari (not Chrome).
2. Tap Share, then Add to Home Screen.
3. The icon is lime on dark and the name is Workout Tracker. It opens full screen, without the Safari toolbar.

The first open needs a network connection so the app can save itself for offline use. After that it works in the gym with no signal. Pull down on any screen to refresh the coach file.

## What is on each tab

- **Home.** Current phase and week of the 8-week block, the 7-day average weight and the change versus last week, Sunday waist, workouts done this week (six dots, Monday to Saturday), today's food against the coach targets, days on target, estimated 1RM for machine chest press, lat pulldown, and one lift Houman picks, the next photo date, and the latest coach note. If this morning's weigh-in is missing, Home asks for it.
- **Train.** Today's workout from the Push / Pull / Legs split, with targets, RIR, last session, and the coach note. Start opens the logger: previous, kg, and reps are prefilled from last time, one tap completes a set, sets can be added or removed, and a rest timer starts after a straight set or after a superset (no rest between the two exercises in a pair). There is an elapsed timer, shoulder-safe swaps, custom exercises, and a finish summary with volume and PRs. Progress charts estimated 1RM. History lists past sessions.
- **Food.** Read-only. Houman does not type meals. The day view shows what Coach committed, with totals against the targets, and earlier days are one tap back.
- **Coach.** The weekly check-in (workouts out of 6, average weight and the change, waist, average calories and protein, days on target, PRs, and each session's sets). Copy check-in for Coach puts a plain-text report on the clipboard, including a note Houman can type on that screen. Photo reminders and the coach note history are here too.

The gear on Home opens backup, the third lift, the step goal, and the plan editor. Steps are typed on the Train screen. They are not read from Apple Health.

## Training plan

The seeded plan is the 8-week block from 2 Nov 2026 through 27 Dec 2026.

| Day | Workout |
| --- | --- |
| Monday | Push A |
| Tuesday | Pull A |
| Wednesday | Legs A |
| Thursday | Push B |
| Friday | Pull B |
| Saturday | Legs B |
| Sunday | Rest, plus an easy long walk |

Supersets are the A1/A2 pairs from the plan. Two exercises that share a letter are a pair: the first has no rest, the second holds the rest. A letter used once is a straight set.

| Phase | Dates | Sets | Effort |
| --- | --- | --- | --- |
| Build | 2 Nov to 15 Nov | As written | About 2 reps in reserve |
| Push | 16 Nov to 29 Nov | Plus 1 set on A moves | About 1 rep in reserve |
| Deload | 30 Nov to 6 Dec | About half the sets | About 3 reps in reserve |
| Peak | 7 Dec to 27 Dec | Plus 1 set on A and B moves | 0 or 1 rep in reserve |

Half sets use ordinary rounding, with a minimum of 1. Three sets become 2. Two sets become 1.

The phase and the week (1 to 8) follow the phone's date. Week 1 starts Monday 2 Nov 2026. After 27 Dec the last phase's rules keep applying, and Home says the block has ended. In Settings, Edit training plan, **Continue 4 more weeks** adds a phase, or edit the dates, set rules, schedule, and exercises directly. Coach can also append a phase from `data/coach.json` (see below). Those remote phases are added on the phone the next time the file loads. They do not delete a phase Houman already edited.

### Progression

Estimated 1RM uses the Epley formula: `weight x (1 + reps / 30)`.

- If every completed set reaches the top of that day's rep range, and he finished at least the prescribed number of sets, next time suggests **+2.5 kg**.
- If he misses the bottom of the range (or does not finish the sets) two sessions in a row for that same workout day, next time suggests holding the weight or dropping 2.5 kg.
- A PR is an estimated 1RM that beats his previous best for that exercise. The first time he logs a lift it sets the baseline and is not marked as a PR.

Suggestions are per workout day, so a heavy Push A day is not judged against a pump Push B day. The 1RM chart itself follows the exercise across every day.

### Shoulder rule

Swaps never offer overhead pressing, dips, or barbell bench. A custom name that matches those is refused. If hanging leg raises bother the shoulder, the safe list includes lying leg raises.

## Coach file

Edit `data/coach.json` on `main` and commit it. The app loads `./data/coach.json` when it opens and when Houman pulls down to refresh. The request is cache-busted and network-first. If the phone is offline, it uses the last copy it saved.

Do not rename the keys. Numbers are plain numbers, dates are `YYYY-MM-DD`, and times are 24-hour `HH:MM`.

### Shape

```json
{
  "version": 1,
  "targets": {
    "kcal_min": 2400,
    "kcal_max": 2600,
    "protein_g": 200
  },
  "food_days": [],
  "notes": [],
  "exercise_overrides": [],
  "plan_changes": []
}
```

`targets` are the daily calorie band and the protein goal. A day is on target only when calories are inside the band (edges count) and protein is at least `protein_g`. Days with no meals are not on target.

`notes` are coach notes. The latest note whose date is today or earlier shows on Home and Train. `title` is optional.

```json
{
  "date": "2026-11-21",
  "title": "Welcome",
  "text": "Welcome. Tell me what you ate in chat and I will log the meals here."
}
```

`exercise_overrides` change one exercise for a date range. They replace the phase math for the fields you set, so `sets: 5` means five sets, not five plus the phase bonus. `day` can be the id (`legs-b`) or the name (`Legs B`). `exercise` can be the id (`leg-press`) or the name (`Leg press`). `replace_with` renames the movement. Overhead pressing, dips, and barbell bench are ignored.

```json
{
  "day": "Legs B",
  "exercise": "Leg press",
  "sets": 5,
  "reps_min": 8,
  "reps_max": 10,
  "rest_sec": 90,
  "rir": "1",
  "replace_with": null,
  "applies_from": "2026-11-16",
  "applies_to": "2026-11-29"
}
```

`plan_changes` are notes, plus optional new phases. A phase is added once, matched by name and start date, and is not removed if you later delete it from the file.

```json
{
  "date": "2026-12-28",
  "text": "Block complete. Repeat the peak rules for four more weeks.",
  "add_phases": [
    {
      "name": "Continue",
      "start": "2026-12-28",
      "end": "2027-01-24",
      "set_mod": "plus-ab",
      "rir": "0-1",
      "conditioning": "Same intervals as peak."
    }
  ]
}
```

`set_mod` is one of `as-written`, `plus-a`, `plus-ab`, or `half`.

### Example food day

Add this object to `food_days`. `label` is the meal name on the card. `name` is the food. If you omit `label`, `name` is the title.

```json
{
  "date": "2026-11-21",
  "meals": [
    {
      "label": "Breakfast",
      "time": "06:30",
      "name": "3 eggs, 1 bowl rice",
      "kcal": 520,
      "protein_g": 24
    },
    {
      "label": "Lunch",
      "time": "12:15",
      "name": "Grilled chicken com tam plate",
      "kcal": 760,
      "protein_g": 52
    },
    {
      "label": "Post-workout",
      "time": "15:00",
      "name": "Meiji protein shake",
      "kcal": 180,
      "protein_g": 30
    },
    {
      "label": "Snack",
      "time": "17:30",
      "name": "Greek yogurt, banana",
      "kcal": 320,
      "protein_g": 32
    }
  ]
}
```

That day is 1,780 kcal and 138 g protein, so it is under the target. Commit the file and ask Houman to pull down to refresh. GitHub Pages can take a minute to show a new commit. The app asks for a fresh URL each time, which avoids a stale cached copy.

## Backup

Settings, Export JSON downloads (or shares) every workout, weigh-in, waist, step count, setting, and the plan. Import JSON replaces what is on the phone. Export before clearing Safari data. The backup never includes the coach file, because that file already lives in this repo.

## Photos

Front, side, and back every two weeks, on Sunday, starting 29 Nov 2026 (then 13 Dec, 27 Dec, 10 Jan, and so on). The app only reminds him. He sends the photos in chat.

## Develop

The site is static. No build step.

```bash
python3 -m http.server 8765
node --test test/logic.test.js
```

Open `http://127.0.0.1:8765/` at a phone width (390px). Add `?as=2026-11-22` to preview a Sunday.

## GitHub Pages

The site is the repo root. `.github/workflows/pages.yml` publishes it with GitHub Actions on every push to `main`. `.nojekyll` is included so Pages serves `data/coach.json` as-is.

If the live URL 404s, Pages is not enabled yet. One-time setup:

1. Open `https://github.com/habouei-creator/workout-tracker/settings/pages`.
2. Under Build and deployment, set Source to **GitHub Actions**.
3. Save. The Deploy GitHub Pages workflow runs on the next push to `main`, or run it from the Actions tab.

Do not also set "Deploy from a branch" at the same time. The workflow is the source.

## Limits

- This repo is public. Anything committed to `data/coach.json`, including meals, is readable by anyone with the URL. There is no login.
- Workouts and weigh-ins are only on that phone until they are exported. A second phone does not sync them.
- Food does not appear until Coach commits `data/coach.json` and the phone can fetch it.
- Estimated 1RM is a formula, not a tested max.
- Steps are typed. Apple Health, sleep, and photos are not connected.
- Rest timers can beep only after the phone has allowed sound. iOS may stay silent if the ringer is off. The timer still shows on screen.
- Private Safari tabs can block storage. Use a normal tab, then Add to Home Screen.
