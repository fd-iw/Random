# 🎲 The Random Emporium

A static website full of random things nobody asked for. No build step and no dependencies: it's plain HTML, CSS and JavaScript.

## What's inside

| Booth | What it does |
| --- | --- |
| 🧠 Random Fact Machine | Gives you a strange but true fact |
| 🥠 Fortune Cookie | Crack it for a fortune and lucky numbers |
| 🎱 Magic 8-Ball | Ask a yes/no question, then shake |
| 🙈 Excuse Generator | Makes up excuses for every occasion |
| 🏷️ Name Generator | Band, pet and wizard names |
| 🎨 Color of the Moment | Random palettes; click a swatch to copy its hex code |
| 🎲 Dice & Coin Tray | Roll d4 to d20, or flip a coin |
| ✊ Rock Paper Scissors | Play against a computer with feelings |
| 🖌️ Pixel Doodle Pad | Paint a 16×16 grid or generate random sprites |
| 🌀 The Emoji Pit | Emojis with physics. Click to add more, or start an earthquake |
| ⚡ Reflex Tester | Wait for green, then click as fast as you can |
| 📖 Random Word | Obscure words like *gongoozler* |
| 📝 Guestbook | Sign it. The entries stay in your own browser |

The floating **🎲 Surprise me** button jumps to a random booth and sets it off.

## Run it locally

Open `index.html` in a browser, or:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy on GitHub Pages

In the repository, go to **Settings → Pages**. Set the source to **Deploy from a branch**, pick the branch and `/ (root)`, and save.

## Files

- `index.html`: page structure
- `css/style.css`: styles, including the light and dark themes
- `js/data.js`: all the random content (facts, fortunes, words…)
- `js/main.js`: the behaviour of each booth
