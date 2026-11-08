# ADRIAN'S COMBAT — AR Invasion

A camera-first AR shooter that runs in the phone browser. No keyboard, no controller: point your phone, hold **FIRE**, tap **RELOAD**, and walk around your room, garden or street. Hold **FIRE** to charge and throw your selected special bomb.

An original camera-first AR shooter built for the phone browser.

---

## What is in the box

- **Live camera AR** — the rear camera is the game view, with a transparent neon HUD and contact shadows on the floor.
- **Motion aim** — gyroscope + compass turn your phone into the gun; drag anywhere to fine-tune. If motion is denied, drag-to-aim still works.
- **Location** — GPS moves you through the real world so enemies and pickups stay anchored around you. GPS is also used for the experimental tag mode.
- **Two touch controls** — FIRE and RELOAD, both the same size like a native AR shooter. Hold FIRE to charge a stronger special bomb. Auto-reload tops up after a short pause or an empty magazine.
- **Armory with 3D preview** — drag to rotate each weapon in a studio render. Six distinct authored gun models, not one tinted rifle.
- **Special bombs** — hold **FIRE** for 0.9 s to charge a stronger Frag, Shock or Cryo blast. A ring fills around the button; the blast gets +35% damage and +18% radius.
- **Progression** — earn Salvage from kills, waves and bosses. Locked weapons are greyed out until bought; the game-over screen shows your next unlock and progress. The first run each day pays 2× Salvage.
- **Enemies** — Hellwasps, Grave Saucers, Gravewalkers, Gorehulks, Void Spawn, Ripclaws, Cacklers, Void Larvae, Hellbrutes, Iron Reapers, Cinderbread, Straw Reapers, Shriek Wraiths, Tomb Bound, Hell Lanterns, Frost Maws, Scream Spires, Rotor Reavers, Sky Shredders, Starfangs, Black Omens, Pale Phantoms, Hex Casters, Rime Terrors, Siege Tanks, Iron Carriers and Grave Artillery, each with their own AI, voice and projectiles. Spawn pools are randomised every wave.
- **Four difficulty levels** — Easy / Normal / Hard / Insane. Scales enemy HP, damage, speed, horde size, shield regen and score. Pick it from the main menu or Settings; it persists.
- **Eleven bosses** every five waves — The Jailer, Bone Maw, The Grinning One, Void Colossus, The Butcher King, The Rainmaker, Aureole, The Brood Queen, The Mirrored, Umbra and The Collector. Original horror archetypes, not licensed characters.
- **Armoured wave modifiers** — every third wave can roll **Armoured Column** (tanks/APCs), **Air Superiority** (fighters/starships), **Horde Surge** (more, faster mobs) or **Elite Guard** (fewer, tougher enemies).
- **Waves, combo multiplier, power-ups** — repair, shield, overcharge, rapid fire, cryo field. Drops magnetise to the player.
- **Squad rooms** — 4-letter codes and nearby-room discovery. Works online through the Cloudflare Durable Object server, or on the same Wi-Fi with `npm run party`.
  - **Free For All** — live score battle, 2–6 phones.
  - **Teams** — auto-balanced 3v3 team score battle.
  - **GPS Tag (experimental)** — outdoors, walk within 15 m of a rival and hold FIRE to tag.
- **Visible LIFE bar** — shield + life with current/max values, green/amber/red health states and a critical low-health pulse. Now shown on phones too.
- **Realistic GLB weapon** — an authored AKM viewmodel with wood/metal materials, muzzle flash, live muzzle light, recoil, reload dip and idle sway.
- **Realistic feedback** — camera recoil, damage-direction arrows, multi-kill callouts, haptics and positional 3D audio.
- **Space-opera SFX** — original synthesized blaster bolts, TIE-style fighter screech, X-wing whine, hyperspace whoosh, Imperial klaxon, droid chirps, lightsaber ignition and a Force-like rumble. These are inspired by the genre, not licensed Star Wars recordings.
- **AR calibration** — field-of-view slider to match your camera, optional camera torch, and aim-assist / haptics / spatial-audio toggles.
- **PBR visual overhaul** — environment reflections, clearcoat armour, procedural surface detail, plus authored GLB starships and monsters from CC0 packs.
- **Glow & shadows** — emissive cores, eyes and thrusters, plus ground/air contact shadows for every enemy.
- **Enemy contact shadows** — flying drones, UFOs and bosses cast a grounding shadow on the floor.
- **PWA manifest and icons** — add it to your home screen for a fuller view where supported.

Character models and the rifle are authored GLB assets; gunshots and reloads use recorded CC0 samples with a synthesized fallback. Everything else is procedural.

---

## Monetization & native apps

The progression loop is built for retention and optional monetization: daily 2× runs, weapon unlock goals, next-unlock progress bars and a cosmetic-friendly economy. See [docs/MONETIZATION.md](docs/MONETIZATION.md) for the recommended store, rewarded-ad and IAP plan, plus Capacitor packaging steps for iOS and Android.

A starter `capacitor.config.json` is included. The web build stays fully playable without any store/ads integration.

## Live build

- **Cloudflare:** https://adrians-combat.hidzir215.workers.dev
- **GitHub:** https://github.com/hidzirtawin/adrians-combat
- Deploy again with `npm run deploy` (Cloudflare Workers + static assets).
- Cloudflare runs a Durable Object squad server at `/ws`, so four-letter rooms work online too. The LAN `npm run party` server is still available for local matches.

## Run it locally

```bash
npm install
```

### Play on a phone (camera + motion + GPS)

```bash
npm run party
```

`npm run party` is the same as `npm run dev:https`: it starts the game and the squad room server on your Wi-Fi over HTTPS. Open the **Network** address printed by Vite on each phone (e.g. `https://192.168.1.116:5173`). The certificate is self-signed — accept the warning once.

Then tap **PLAY** and allow:

1. **Camera** — the AR view.
2. **Motion & orientation** — the aim.
3. **Location** — real-world movement and GPS tag.

> Phone browsers require a secure context for camera and motion. Plain `http://` only works on `localhost`.

### Play on the laptop

```bash
npm run dev
```

Open `http://localhost:5173`. A webcam is used if available; otherwise the game runs against a dark holographic backdrop and mouse-drag aiming.

### Production build

```bash
npm run build
```

The static site is written to `dist/`. Host it on any **HTTPS** static host. Camera, motion and GPS will work there.

> Squad rooms need the small WebSocket room server. It is bundled with the Vite dev/preview server, so for the party run `npm run party` on a laptop on the same Wi-Fi. A static-only deployment gives you solo mode and reports the room server as offline.

---

## Squad rooms

1. From the main menu tap **SQUAD**.
2. Enter a callsign.
3. **CREATE ROOM** (pick FFA, Teams or GPS Tag) or join a room from the **nearby rooms** list / enter its 4-letter code.
4. Every player taps **ENTER ARENA** when ready.
5. Scores sync live. Open SQUAD again from the menu to review the room between runs.

Same Wi-Fi only, up to six phones. The room server keeps a scoreboard; it does not simulate enemies or share an AR world map.

### An honest limitation

Native AR games use ARKit/ARCore to share a physical world map between phones. Mobile browsers cannot do that reliably. ADRIAN'S COMBAT therefore delivers:

- true camera + motion + GPS **solo** AR;
- same-Wi-Fi **score rooms** for FFA and Teams;
- an experimental **GPS proximity tag** overlay.

A true cross-phone laser-tag clone needs a native ARKit/ARCore (or Unity MARS / Niantic Lightship) build. The game code here is organised so that the AR camera, enemy simulation and scoring can be reused if you take that route later.

Browser camera AR also has no depth sensing or room occlusion. Holograms can appear in front of furniture or people, and the virtual gun is a screen-space overlay. For the most convincing result, use a rear camera in a well-lit room and tune the **AR field of view** slider until the floor grid matches your camera. Native ARKit/ARCore would be required for real plane anchoring and occlusion.

---

## Controls

| Action | Control |
| --- | --- |
| Aim | Turn the phone (gyro) or drag anywhere |
| Fire | Hold **FIRE** |
| Reload | **RELOAD** (auto-reloads when empty or below 30%) |
| Special bomb | Hold **FIRE** for 0.9 s, then the charged bomb is thrown |
| Change loadout | **ARMORY** on the main menu |
| Pause / exit | Small pause icon, top-right |

There are no movement keys and no virtual joystick. Weapon choice happens in the Armory before a run.

### Weapons and bombs

**Primaries**

| Weapon | Style | Magazine |
| --- | --- | --- |
| Pulse Rifle | Balanced automatic | 32 |
| Viper SMG | Very fast, close range | 40 |
| ARX Rifle | Hard-hitting automatic | 30 |
| Scatter Blaster | 8-pellet shotgun | 6 |
| Longshot DMR | Semi-auto marksman | 14 |
| Rail Lance | Piercing anti-armor shot | 4 |

**Bombs**

| Bomb | Effect | Cooldown |
| --- | --- | --- |
| Frag | 220 damage in a 6 m blast | 12 s |
| Shock | 120 damage, 8 m, brief freeze | 14 s |
| Cryo | 80 damage, 9 m, long freeze | 13 s |

The Armory shows damage, rate, magazine, range, radius and freeze values on each card. Loadout persists between runs and squad sessions.

### Realism settings

Open **Settings** for:

- **AR field of view** — 50–90°, so the holograms line up better with your phone camera.
- **Camera torch** — usable on supported rear cameras; ideal for dark rooms.
- **Aim assist** — on by default; turn it off for raw aiming.
- **Haptic feedback** — short vibrations on fire, hits and damage (supported phones).
- **3D positional audio** — enemy shots, explosions and pickups pan to their real direction.
- **Visual quality** — low / medium / high pixel ratio and menu bloom.

In **GPS Tag**, when another player is within 15 m the HUD shows their name and distance. Hold **FIRE** to send a tag. Tags award points and reduce their tag HP; 0 HP is an elimination and respawn. Works best outdoors with a clear sky view.

---

## Difficulty

Pick a level on the main menu or in **Settings**. The choice is saved.

| Level | Enemies | Damage | Horde | Score | Shield regen |
| --- | --- | --- | --- | --- | --- |
| **Easy** | 72% HP | 55% | 80% | 80% | 23/s |
| **Normal** | 100% | 100% | 100% | 100% | 18/s |
| **Hard** | 140% HP | 135% | 120% | 130% | 15/s |
| **Insane** | 200% HP | 180% | 140% | 170% | 12/s |

Boss HP scales separately (70% / 100% / 135% / 190%). Enemy speed also rises slightly on Hard and Insane.

---

## The eleven bosses

Boss order: 5 The Jailer, 10 Bone Maw, 15 The Grinning One, 20 Void Colossus, 25 The Butcher King, 30 The Rainmaker, 35 Aureole, 40 The Brood Queen, 45 The Mirrored, 50 Umbra, 55 The Collector, then the cycle repeats.

| Boss | Style |
| --- | --- |
| **The Jailer** | Orbiting sentinel fortress; radial barrage + aimed bursts. |
| **Bone Maw** | Huge undead dinosaur; charges, bites and roars shockwave blasts. |
| **The Grinning One** | Floating horror clown; confetti projectiles, mallet, summons Cacklers. |
| **Void Colossus** | Cosmic armoured titan; dense energy fans and a summon phase. |
| **The Butcher King** | Fast melee tyrant; rushdown bursts and brutal energy. |
| **The Rainmaker** | Heavy saucer; dense projectile fans, summons escorts at 50% HP. |
| **Aureole** | Ringed sentinel; twin expanding projectile rings + aimed fan. |
| **The Brood Queen** | Ground queen; closes in, summons Gravewalkers, radial fire. |
| **The Mirrored** | Two fast amber sentinels at once. |
| **Umbra** | Fast, aggressive aimed bursts. Keep turning. |
| **The Collector** | Armoured saucer that keeps summoning Grave Saucers. |

Every fifth wave cycles through them. All villains are original designs, not licensed characters.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Camera stays black / **CAM** chip is red | Use `npm run dev:https` (or an HTTPS deployment) and allow camera access. Reload after changing permissions. |
| No gyro / **GYRO** chip red | Allow Motion & Orientation (iOS asks explicitly). Drag to aim instead. |
| Camera works but aim drifts | Drag to re-centre. On iOS, keep the phone upright; magnetometer noise settles after a few seconds. |
| **GPS** chip red or tag distance is wrong | Go outdoors; indoor GPS is usually too inaccurate. Location is optional for solo play. |
| Squad server offline | Start `npm run party` (not a static-only host) and keep all phones on the same Wi-Fi. |
| iPhone doesn’t enter fullscreen | iOS Safari does not support fullscreen for web pages; use Add to Home Screen for a fuller view. |
| Very hot phone / low FPS | Settings → Visual quality → **LOW**. |

---

## Project layout

```
index.html              HUD, menus, squad lobby
src/
  main.ts               boot + error handling
  game.ts               camera-AR game loop, waves, scoring, squad glue
  cameraAR.ts           camera stream, gyro/compass aim, GPS tracking
  enemies.ts            animated GLB enemies + procedural bosses
  weapons.ts            six primaries + AKM viewmodel
  bombs.ts              Frag / Shock / Cryo bomb definitions
  pickups.ts            power-ups and magnet collection
  hud.ts                HUD, radar, squad board, tag prompt
  fx.ts                 pooled tracers, sparks, shockwaves, damage numbers
  audio.ts              recorded gun samples + synthesized SFX + synthwave loop
  arena.ts              desktop training arena / menu diorama
  squad.ts              WebSocket room client
  settings.ts           persisted settings and records
server/
  squadPlugin.mjs       same-origin Wi-Fi room server for Vite dev/preview
```

---

## Credits

- Built with [Three.js](https://threejs.org/) + Vite.
- **FPS rifle model**: “AKM” by **J-Toastie** via [Poly Pizza](https://poly.pizza/m/ZBBoDqAn0A), CC-BY.
- **Characters**: Zombie, Alien, Velociraptor, T-Rex and Animated Robot by **Quaternius** via [Poly Pizza](https://poly.pizza/u/Quaternius), CC0.
- **Gunshot recordings**: “Gunshot Sounds” by **Tabasco** via [OpenGameArt](https://opengameart.org/content/gunshot-sounds), CC0.
- **Reload / pump recordings**: “Gun reload sounds” by **SpringySpringo** via [OpenGameArt](https://opengameart.org/content/gun-reload-sounds), CC0.
- UI, arena, bosses, effects and all remaining audio are generated in this project.

See [CREDITS.md](CREDITS.md) for full asset links and license text, and [docs/REALISM.md](docs/REALISM.md) for the photoreal-asset tradeoffs and upgrade path.

### Open asset sources used

- [Papyszoo/CC0-Public-Domain-Models](https://github.com/Papyszoo/CC0-Public-Domain-Models) — the CC0 pack used for the Striker/Omen starships, Phantom, Hex Caster and Rime Terror.
- [KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) — PBR glTF reference models.
- [olatunde85/3d-gen](https://github.com/olatunde85/3d-gen) — CC0 MakeHuman pipeline for realistic rigged humans.
- [madjin/awesome-cc0](https://github.com/madjin/awesome-cc0) — curated CC0 art, 3D, texture and audio links.
- Poly Haven, Kenney, Quaternius and KayKit for photoreal PBR and stylized CC0 packs.

Have fun — and happy hunting.
