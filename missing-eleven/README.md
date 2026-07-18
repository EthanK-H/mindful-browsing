# ⚽ Missing Eleven — England 1–2 Argentina (World Cup 2026 Semi-final)

A lineup-guessing game for the 2026 FIFA World Cup semi-final played on
**15 July 2026 at Mercedes-Benz Stadium, Atlanta**: both starting XIs are hidden
on the pitch in their real formations — name every player.

## How to run

It's a single self-contained HTML file: **no dependencies, no build step, no network calls.**

**Option 1 — just open it:**

Double-click `missing-eleven/index.html` (or drag it into any browser).

**Option 2 — local server (recommended):**

```bash
cd missing-eleven
python3 -m http.server 8080
# then open http://localhost:8080
```

or with Node:

```bash
npx serve missing-eleven
```

## Game modes

| Mode | Rules |
|------|-------|
| ⚽ **Classic** | Count-up clock, 3 first-letter hints. Find all 22. |
| ⚡ **Blitz** | 3-minute countdown, no hints. Name as many as you can. |
| 💀 **Sudden Death** | Three wrong guesses and it's full time. |
| 🎬 **Key Moments** | Guess the scorers, the assist, and both managers. |

Plus: play **both XIs**, **England only**, or **Argentina only**.

## Features

- Real formations on a floodlit pitch — England 4-2-3-1 (bottom), Argentina 4-4-2 (top)
- Jersey-flip reveal animations, goal ⚽ / assist 🅰️ badges, captain armbands
- Forgiving name matching: surnames, accents ignored, nicknames (`dibu`, `licha`, `cuti`, `enzo`…)
- Ambiguity handling ("Martínez… which one?")
- Live progress bar, per-team counters, wrong-guess tracking
- Personal bests saved locally per mode/team
- Shareable emoji result grid (Wordle-style), copy to clipboard
- Sound effects (WebAudio, mutable) and confetti on a full house
- Fully responsive — works on phones

## The match

**England 1–2 Argentina** · ⚽ Gordon 55′ · ⚽ E. Fernández 85′ · ⚽ L. Martínez 90+2′ (assist: Messi)

- **England (4-2-3-1, Thomas Tuchel):** Pickford; James, Stones, Guéhi, Spence; Rice, Anderson; Rogers, Bellingham, Gordon; Kane
- **Argentina (4-4-2, Lionel Scaloni):** E. Martínez; Molina, Romero, L. Martínez, Tagliafico; Simeone, Mac Allister, Paredes, E. Fernández; Messi, Álvarez

Lineups and events compiled from post-match reports
([SI](https://www.si.com/soccer/england-vs-argentina-confirmed-lineups-2026-world-cup-semifinal),
[ESPN](https://www.espn.com/soccer/match/_/gameId/760515/argentina-england),
[Al Jazeera](https://www.aljazeera.com/sports/liveblog/2026/7/15/england-vs-argentina-live-fifa-world-cup-2026-semifinal),
[FIFA](https://www.fifa.com/en/match-centre/match/17/285023/289290/400021540)).
