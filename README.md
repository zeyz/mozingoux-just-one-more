# Just One More

Austin Mozingo’s personal browser arcade. An original, self-contained website with six playable games: Klondike solitaire, Bubble Break, Good Memory, Cosmic Pinball (the Cosmic Current table), Snake Club, and Double Up.

## Play locally

From this folder:

```sh
npm start
```

Then open http://localhost:8000. Alternatively, `python3 -m http.server 8000` works directly. ES modules require an HTTP server; opening index.html as a file will display the lobby but browsers may block game module loading.

There are no third-party runtime dependencies or build steps. All art is original SVG, CSS, and canvas. Everything is served locally; the site makes no external font, image, analytics, or game API requests. A current browser with ES modules, canvas, Pointer Events, and native dialog support is required.

## Games

- **Solitaire:** Klondike, draw one. Click/tap a face-up card and then its destination. Unlimited stock recycling, undo, and auto-foundation. All 52 cards must reach foundations. Some deals cannot be won.
- **Bubble Break:** Pop orthogonally connected groups of matching symbols. Gravity and column collapse create new groups. Undo, three difficulty palettes, and a full-clear bonus.
- **Good Memory:** Match 6, 8, or 12 pairs. Timer pauses with the game or hidden tab; efficiency scores are saved separately per board size.
- **Cosmic Pinball:** Hold/release Space on the table to launch. Hold A/D or left/right arrows for the flippers. Touch controls work simultaneously. Three balls, scoring bumpers, orbit beacons, launch save, and real continuous collision simulation.
- **Snake Club:** Choose your pace, press Start, steer with arrows/WASD, swipes, or direction buttons. Collect food, grow, and avoid walls and your own tail.
- **Double Up:** A 2048-style puzzle with arrows/WASD, swipes, and direction buttons. Identical tiles merge once per move. Undo once, reach 2048, and continue beyond it.

## Shared controls

Every game includes instructions, fresh start, pause, return to library, and local high scores. Optional synthesized sound is off by default. Games stop advancing when the tab is hidden or instructions are open. Switching games or refreshing starts a new round; current rounds are not saved.

Scores and sound preference use only `jom-scores` and `jom-sound` in browser localStorage, with an in-memory fallback if storage is unavailable. There are no accounts, ads, payments, online leaderboards, personal-data forms, or telemetry. Resetting scores uses a confirmation dialog and affects only this arcade’s data on the current browser.

## Tests

```sh
npm test
```

Tests cover solitaire legality, hidden-card flips, immutability, card conservation, stock recycling and foundations; bubble grouping/gravity/end detection; memory decks/scoring; snake movement/collisions/food; 2048 merge orientation, once-per-move rules and termination; and pinball trajectory, collision scoring, flipper impact, balls/restart, pause, keyboard ownership and cleanup.

## Deploy

Publish the root of the main branch with GitHub Pages. `.nojekyll` is included. The app uses relative asset paths and hash-based game links, so it supports a GitHub Pages project subpath.

© 2026 Austin Mozingo / MozingoUX. This is a personal playable proof of concept. Classic game rules are implemented with original code and artwork.

## Verification

See [QA.md](QA.md). Actual desktop and phone browser captures for all six games are in `screenshots/`.
