# Neon Snake VR

A classic snake game reimagined on a neon-lit tabletop in VR. Built with [IWSDK](https://iwsdk.dev) — playable in browser and Meta Quest headsets.

**[▶ Play Now](https://ellyz2426.github.io/neon-snake/)**

## Features

### 4 Game Modes
- **Classic** — Standard snake with wall collision
- **Speed** — Accelerates as you score higher
- **Maze** — Navigate through obstacle patterns (6 unique layouts)
- **Wrap** — No walls; snake wraps around edges

### 3 Difficulty Levels
- Easy / Normal / Hard (controls move speed)

### Power-Ups
- ⚡ **Speed Boost** — Move faster for 5 seconds
- 🛡️ **Shield** — Invincibility for 4 seconds
- ✖️ **2X Score** — Double points for 6 seconds
- 🟢 **Shrink** — Remove 3 tail segments
- 🔵 **Slow Motion** — Reduced speed for 5 seconds

### Progression
- Level system (every 8 food eaten increases level + speed)
- Combo scoring (eat food quickly for multipliers up to 5x)
- 30 achievements with persistence
- Local leaderboard (top 10 scores)
- Per-mode statistics tracking

### Visual Effects
- Neon grid arena with glowing borders
- Snake trail effects that fade behind you
- Particle effects on eat, combo, and death
- Screen shake on death
- Starfield background with fog
- Power-up color changes on snake head
- Animated food with pulsing glow

### Audio
- Procedural synth audio via Web Audio API
- Eat, combo, death, start, pause, power-up, level-up, achievement sounds

### Controls
| Action | Keyboard | VR Controller |
|--------|----------|---------------|
| Move | Arrow Keys / WASD | Thumbstick |
| Start / Confirm | Space / Enter | Right Trigger |
| Pause / Resume | Escape / P | A Button |

### UI Panels (All PanelUI/uikitml)
8 spatial UI panels — no HTML DOM overlays:
1. HUD (score, length, best)
2. Main Menu (mode, difficulty, start)
3. Game Over (final stats, retry, menu)
4. Pause (resume, quit)
5. Achievements (30 entries, paginated)
6. Toast Notifications
7. Statistics
8. Leaderboard (top 10)

## Tech

- IWSDK v0.4.x (Three.js r181 + EliCS v3.4.2)
- TypeScript, Vite 7, PanelUI with uikitml
- ~3,100 lines of source code
- Browser-first with XR support

## Development

```bash
npm install
npm run dev
```

## License

MIT
