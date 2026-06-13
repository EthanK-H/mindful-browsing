# Gearbound — A Clockwork Quest

A steampunk monster-battling RPG that runs entirely in the browser. Walk
three towns and two routes, catch clockwork automatons in the tall grass,
level them up, and defeat the two Gym Leaders to become Champion.

## Play

Open **`gearbound.html`** in any modern browser — it's a single
self-contained file (no server, no build step, no network needed).

## Controls

- **Move:** WASD or Arrow keys
- **Interact / Advance text:** E, Space or Enter
- **Team menu:** P
- **Music & sound:** toggle with the ♪ button (top-right)

## Features

- **Monster sprites** from the open-source [Tuxemon](https://github.com/Tuxemon/Tuxemon)
  project (CC BY-SA 3.0 / GPL-3.0 — see `CREDITS.md`), with each species
  and evolution stage mapped to a matching Tuxemon creature
- Hand-built **SVG art** for the player, NPCs, terrain, buildings, UI and
  the evolution cutscene — no emoji
- Steampunk theme: brass/parchment UI, riveted buildings, an animated
  arena backdrop with rotating gears, a clockwork skyline and a drifting
  airship
- **Procedural music** (an overworld waltz and a battle theme) plus
  sound effects, all synthesised live with the Web Audio API
- **Per-move attack animations** — signature effects for Sky Dive,
  Quake Stomp, Hydro Jet, Flame Burst, Spark Bolt, Thunder Fang,
  Shadow Rake, Leaf Blade, Blizzard Screech and Quick Hit, on top of the
  per-type particle effects, with screen flashes and arena shake
- **Walk-in buildings** — step through any door into a furnished
  interior (lab, heal centre, mart, gym) and talk to the keeper inside
- **Evolution** — eight evolution lines (including 3-stage chains) with a
  full-screen evolution cutscene
- **Training Academy** in Willowbrook (bottom-right) levels up your lead
  for free, so you can test evolutions quickly
- Type effectiveness, STAB, criticals, levels/XP, catching, a party of
  up to six, trainer and gym battles, a shop, heal centres, and autosave

## Source layout

The game is authored as separate files for easier editing:

| File | Purpose |
|------|---------|
| `index.html` | markup + game logic |
| `theme.css` | steampunk styling |
| `sprites.js` | custom SVG art for world/UI (`window.ART`) |
| `monster-art.js` | Tuxemon monster sprites as data URIs (`window.MON_ART`) |
| `assets/monsters/` | the raw Tuxemon PNG sprites |
| `audio.js` | procedural music + SFX (`window.AUDIO`) |

`gearbound.html` is the distributable bundle. Rebuild it after editing any
source file with:

```
node build.js
```
