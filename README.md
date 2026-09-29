# 🎲 Random Emporium

A static website with 31 booths of useless randomness. It has sound effects, achievements, a command palette, confetti, and no build step. It's plain HTML, CSS and JavaScript.

## Booths

| Category | Booths |
| --- | --- |
| **Generators** | Startup Idea · Excuse · Band/Pet/Wizard Names · Superpower Roulette · Haiku Machine · Shakespearean Insult · Absurd Recipe · Passphrase (cryptographically random) · Lorem Ipsum (pirate / hipster / corporate) |
| **Games** | Wheel of Fortune (editable slices) · Magic 8-Ball · Dice & Coin · Rock Paper Scissors · Would You Rather · Slot-machine Random Number · Higher or Lower · Reflex Tester |
| **Art & Toys** | Generative Flow-field Art (download PNG) · Color Palette · Gradient Generator (copy CSS) · Melody Maker · Pixel Doodle Pad · Game of Life · Maze Generator + Solver · Emoji Physics Pit |
| **Mystic** | Tarot-ish Reading · Fortune Cookie |
| **Knowledge** | Random Facts · Word of the Moment · cowsay · Guestbook |

## Features

- **Sound effects** made with the Web Audio API, so there are no audio files. Toggle them with the speaker button or `M`.
- **15 achievements**, with toasts and confetti when you unlock one.
- **Command palette** (`⌘K` / `Ctrl+K` / `/`) with fuzzy search over every booth and action.
- **Keyboard shortcuts:** `R` for a random booth, `T` for the theme, `?` for help. There's also a Konami code easter egg.
- **Randomness Report:** your clicks, the booths you've tried, clicks per category and achievements. It's all stored in your browser only.
- **Category filters and live search**, dark and light themes, reveal-on-scroll animations, and a cursor spotlight on each card.
- Works on phones and respects `prefers-reduced-motion`.
- Icons by [Lucide](https://lucide.dev), vendored in `vendor/` (ISC license).

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy on GitHub Pages

Go to **Settings → Pages → Deploy from a branch**, then pick this branch and `/ (root)`.

## Project layout

```
index.html            page shell and booth markup
css/style.css         design system (tokens, themes, components)
js/data.js            all the random content
js/core.js            utilities, sound engine, confetti, toasts, achievements, stats
js/booths.js          original booths
js/booths-extra.js    newer booths (wheel, art, maze, life, melody…)
js/app.js             card chrome, filters, command palette, shortcuts, report
vendor/lucide.min.js  icon library
```
