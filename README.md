# 指尖僵尸

A portrait LayaAir 2.5D survival shooter. Fully static, self-contained, no remote CDN or backend required.

## Run

Serve `dist/` with any static web server (e.g. `python3 -m http.server --directory dist 8000`). Open over HTTP, not file://.

## Play

- Choose one of three survivors, a starting firearm, and a melee weapon.
- Move and face with WASD / arrows or the left touchscreen joystick. Releasing movement retains facing. Hold the right attack button or J to fire strictly in that direction; there is no auto-aim or auto-fire.
- Q switches among four firearms; R reloads. Empty magazines reload automatically.
- Space uses the selected melee weapon; E uses the survivor skill.
- Escape pauses. Losing focus also pauses. Pointer release, cancellation, lost capture, upgrades, pauses and match transitions clear held controls. The move and attack controls use independent pointer IDs.
- Collect amber XP crystals and choose upgrades. Medkits heal.
- Survive five minutes and defeat the mutation boss that arrives at 4:30 to extract.

## Content

3 survivors and individual skills; 4 firearms; 3 melee weapons; 4 regular enemy types and final boss; 10 timed waves; 12 ranked upgrade cards; generated character/weapon/key-art assets; procedural sound effects; pause, retry, and character selection.

## Source

- `dist/game.js`: game configuration, simulation, LayaAir rendering, input and UI.
- `dist/upgrades.js`: bounded card ranks, random offers, rerolls, derived modifiers and combat effects.
- `dist/style.css` / `dist/mobile.css` / `dist/index.html`: responsive preparation screen and portrait HUD.
- `dist/sprites/`: generated character, portrait and weapon textures.
- `dist/art.webp`: generated preparation-screen key art.
- `dist/vendor/laya.core.js`: official Layabox demo distribution, LayaAir 2.12.1beta; includes WebGL.
  Source: https://github.com/layabox/layaair-demo/blob/master/h5/libs/laya.core.js
- `dist/vendor/LICENSE-LayaAir`: LayaAir MIT license.

## Validation

JavaScript syntax and local asset references checked. A headless simulation (mock DOM and graphics) checked all survivor skills, gun magazines/reloads, melee kills, upgrades, pause/resume, a 316-second match including all waves and boss spawning, victory/defeat, and lobby return. This does not substitute for device/browser rendering and touch testing.

This is a playable prototype. Characters use generated static sprites with procedural bobbing and facing; they are not rigged 3D models. Gameplay is single-player and progress resets each match.

## Mobile combat update

- Portrait preparation screen with Survivor/Equipment tabs; safe-area and visualViewport-aware canvas height.
- Larger independent move/fire controls, dedicated reload, separated melee and skill buttons.
- Dense spawn groups with 180 regular-enemy cap, spatial-bucket separation, bounded effects.
- Higher weapon output, multi-target penetration, directional melee, hit pushback, combo counter and death motion.
- Scout: triple-lane held fire and afterimages. Heavy: expanding shockwave and hex shield that intercepts poison. Medic: rotating healing field and synchronized damage pulses.
- Facing cone shows retained direction. Camera reserves room around the player near arena edges.

Validation: mocked-DOM input events checked press/release/cancel/lost capture, concurrent movement and firing, all eight retained directions, no automatic firing or target selection, reload, piercing vs. walls, all three skills, upgrade/pause resets, six viewport fit calculations (320×568 through 430×932, tablet, landscape), and a 316-second dense-wave simulation. DOM and asset references validated. This does not constitute real-device or browser visual QA.

## Movement and upgrade-card update

Skill, melee, reload and weapon switching now activate from their own pointerdown events, including non-primary touches. They retain the joystick/fire pointers and deduplicate synthesized clicks. Upgrade/pause/end transitions clear all combat pointer ownership.

The three-card offer now draws from 12 bounded card types: multishot, piercing, chain lightning, direct-kill explosions, frost, melee storm, cooldown cycling, role awakening, faster firing/reload, healing on kill, armor, and XP/magnet pickup. Cards display the next rank and its actual effect. Capped cards leave the pool. Offers contain no duplicates and include a mechanic card while one is eligible. Each match has three rerolls. Acquired abilities remain visible in upgrade and pause menus.

Run `node tests/game-regression.cjs` for the dependency-free simulation/input regression suite. It uses mocked DOM/graphics, not a real browser; checks simultaneous movement/fire/skill/melee, touch/click deduplication, all card mechanics and rank limits, rerolls, exhausted pools, and a 316-second dense match.
