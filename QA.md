# Arcade verification

October 30, 2026. Tested in the desktop in-app browser.

## Automated checks

`npm test`: 23 passing checks across all six games, including 400 deterministic mixed solitaire actions checking card conservation and immutability. Pinball checks cover launch trajectories, held-flipper impact, collision scoring, balls/gameover/restart, pause/hidden timing, keyboard focus ownership, and cleanup. JavaScript syntax checks pass.

## Browser playtests

- Solitaire: selected a two of clubs and moved it onto a three of hearts; move count advanced. Drew a stock card, undid the draw, opened/closed instructions, and paused/resumed.
- Bubble Break: popped four connected bubbles; score increased by 12 and remaining count dropped from 120 to 116. Undo restored the board and score while retaining the best score.
- Good Memory: completed an entire eight-pair round by revealing and remembering cards; confirmed all pairs matched, win message, timed score, and saved best. The best survived a page reload.
- Cosmic Pinball: held/released Space to launch; operated both flippers using A/D; observed bumper/orbit scoring and ball loss/re-serve; root pause overlay worked. Seven physics/input tests supplement browser play.
- Snake Club: changed pace, started the game, steered with touch buttons, observed position updates, and paused/resumed.
- Double Up: used direction buttons to merge two tiles and earn points; undo restored the earlier board; keyboard movement advanced the board again.
- Shared controls: game switching, instructions dialogs, about dialog, sound toggle, global pause, fresh starts, and confirmed high-score reset. Test high scores were cleared afterward.

## Responsive and accessibility checks

Lobby and all six games opened at 1440px desktop and 390px phone width. No horizontal overflow. Every input/select has a label. Visible focus, semantic buttons, keyboard instructions, native modal dialogs, symbol-plus-color bubble identification, native selectable solitaire cards, reduced-motion CSS, and text score/status feedback are included. Snake and pinball are visual reaction games; this is not a claim of full nonvisual accessibility or formal WCAG certification.

No browser JavaScript errors observed during these checks. Browser screenshots are in `screenshots/`.

## Privacy and scope

No external runtime dependencies, remote fonts, images, tracking, accounts, purchases, or backend. High scores and sound preference stay in this browser. Current game rounds reset when changing games or reloading. Owner: Austin Mozingo.
