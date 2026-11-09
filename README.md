# ADRIAN'S COMBAT MISSION — AR Invasion

A camera-first AR shooter that runs in the phone browser. No keyboard, no controller: point your phone, hold **FIRE**, tap **RELOAD**, and walk around your room, garden or street. Tap **BOMB** to throw your selected special bomb, or hold **FIRE** to charge a stronger one.

An original camera-first AR shooter built for the phone browser.

---

## What is in the box

- **Live camera AR** — the rear camera is the game view, with a transparent neon HUD and contact shadows on the floor.
- **Motion aim** — gyroscope + compass turn your phone into the gun; drag anywhere to fine-tune. If motion is denied, drag-to-aim still works.
- **Location** — GPS moves you through the real world so enemies and pickups stay anchored around you. GPS is also used for the experimental tag mode.
- **Three touch controls** — FIRE, RELOAD and BOMB. Tap BOMB to throw your equipped explosive, or hold FIRE for 0.9 s to charge a stronger blast. Auto-reload tops up after a short pause or an empty magazine.
- **Armory with 3D preview** — drag to rotate each weapon in a studio render. Six authored GLB guns plus twelve procedural rifles, pistols, revolvers, an LMG and sci-fi blasters.
- **Special bombs** — tap **BOMB** to throw your equipped Frag, Shock, Cryo, Plasma, Cluster, EMP, Incendiary, Acid, Flashbang, Graviton or Nuke bomb. Hold **FIRE** for 0.9 s to charge a stronger version: +35% damage and +18% radius. Incendiary and Acid leave burning pools; Graviton pulls enemies into the blast.
- **Sector levels** — eight named levels of ten waves each, with unique accents, enemy rosters, sector bosses and escalating multipliers. Levels loop with harder modifiers after the eighth sector.
- **Progression** — seven starter weapons are unlocked immediately: Pulse Rifle, Viper SMG, Vanguard AR, Scatter Blaster, Sidearm 9, Magnum 44 and Wasp 93. Earn Salvage from kills, waves and bosses for the rest; the game-over screen shows your next unlock. The first run each day pays 2× Salvage.
- **Enemies** — Hellwasps, Grave Saucers, Gravewalkers, Gorehulks, Void Spawn, Ripclaws, Cacklers, Void Larvae, Hellbrutes, Iron Reapers, Cinderbread, Straw Reapers, Shriek Wraiths, Tomb Bound, Hell Lanterns, Frost Maws, Scream Spires, Rotor Reavers, Sky Shredders, Starfangs, Black Omens, Pale Phantoms, Hex Casters, Rime Terrors, Siege Tanks, Iron Carriers, Grave Artillery, Grim Reapers, Evil Clowns, Abyssal Krakens, Emerald Harriers, Void Symbiotes, Hell Monkeys, Ironhide Rhinos and Crimson Maelstroms, each with their own AI, voice and projectiles. Spawn pools are randomised every wave.
- **Four difficulty levels** — Easy / Normal / Hard / Insane. Scales enemy HP, damage, speed, horde size, shield regen and score. Pick it from the main menu or Settings; it persists.
- **Thirteen bosses** every five waves — The Jailer, Bone Maw, The Grinning One, Abyssal Kraken, Void Colossus, The Butcher King, Crimson Maelstrom, The Rainmaker, Aureole, The Brood Queen, The Mirrored, Umbra and The Collector. Original creature designs, not licensed characters.
- **Armoured wave modifiers** — every third wave can roll **Armoured Column** (tanks/APCs), **Air Superiority** (fighters/starships), **Horde Surge** (more, faster mobs) or **Elite Guard** (fewer, tougher enemies).
- **Waves, combo multiplier, power-ups** — repair, shield, overcharge, rapid fire, cryo field. Drops magnetise to the player.
- **Squad rooms** — 4-letter codes and nearby-room discovery. Works online through the Cloudflare Durable Object server, or on the same Wi-Fi with `npm run party`.
  - **Free For All** — live score battle, 2–6 phones.
  - **Teams** — auto-balanced 3v3 team score battle.
  - **GPS Tag (experimental)** — outdoors, walk within 15 m of a rival and hold FIRE to tag.
- **Visible health bar** — shield + health with current/max values, green/amber/red health states and a critical low-health pulse. Now shown on phones too.
- **Realistic GLB weapon** — an authored AKM viewmodel with wood/metal materials, muzzle flash, live muzzle light, recoil, reload dip and idle sway.
- **Realistic feedback** — camera recoil, damage-direction arrows, multi-kill callouts, haptics and positional 3D audio.
- **Space-opera SFX** — original synthesized blaster bolts, TIE-style fighter screech, X-wing whine, hyperspace whoosh, Imperial klaxon, droid chirps, lightsaber ignition and a Force-like rumble. These are inspired by the genre, not licensed Star Wars recordings.
- **Optional local soundtrack** — the menu and gameplay music is synthesized in-engine. You can load your own MP3s from your device; the playlist is stored in IndexedDB and is never uploaded.
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

Native AR games use ARKit/ARCore to share a physical world map between phones. Mobile browsers cannot do that reliably. ADRIAN'S COMBAT MISSION therefore delivers:

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
| Bomb | Tap **BOMB** to throw the equipped bomb |
| Charged bomb | Hold **FIRE** for 0.9 s, then release for a stronger blast |
| Change loadout | **ARMORY** on the main menu |
| Pause / exit | Small pause icon, top-right |

There are no movement keys. The AR **EVADE** stick lets you sidestep incoming fire, and weapon choice happens in the Armory before a run.

### Weapons and bombs

**Primaries**

| Weapon | Category | Style | Magazine |
| --- | --- | --- | --- |
| Pulse Rifle | Rifle | Balanced automatic | 32 |
| Viper SMG | SMG | Very fast, close range | 40 |
| ARX Rifle | Rifle | Hard-hitting automatic | 30 |
| Scatter Blaster | Shotgun | 8-pellet shotgun | 6 |
| Longshot DMR | Sniper | Semi-auto marksman | 14 |
| Rail Lance | Sniper | Piercing anti-armor shot | 4 |
| Vanguard AR | Rifle | Fast-handling carbine | 30 |
| Warlord AK | Rifle | Heavy battle rifle | 30 |
| Sentinel BR | Rifle | Precision semi-auto | 15 |
| Sidearm 9 | Pistol | Service pistol | 15 |
| Magnum 44 | Pistol | Six-shot revolver | 6 |
| Wasp 93 | Pistol | Machine pistol | 24 |
| Vector PDW | SMG | Hyper-cyclic PDW | 50 |
| Breacher 12 | Shotgun | Auto shotgun, 10 pellets | 8 |
| Vulcan LMG | LMG | Belt-fed suppression | 100 |
| Ion Blaster | Blaster | Heavy hand cannon | 12 |
| Plasma Carbine | Blaster | Rapid plasma rifle | 45 |
| Disruptor | Blaster | Piercing plasma sniper | 4 |

**Bombs**

| Bomb | Effect | Cooldown |
| --- | --- | --- |
| Frag | 220 damage in a 6 m blast | 12 s |
| Shock | 120 damage, 8 m, brief freeze | 14 s |
| Cryo | 80 damage, 9 m, long freeze | 13 s |
| Plasma | 340 damage in a 7 m blast | 18 s |
| Cluster | 150 damage in an 11 m blast | 17 s |
| EMP | 90 damage, 10 m, long freeze | 15 s |
| Incendiary | 140 damage, 8 m + burning pool | 16 s |
| Acid | 100 damage, 7 m + stronger burning pool | 15 s |
| Flashbang | 35 damage, 10 m, long stun | 14 s |
| Graviton | 260 damage, 7 m, pulls enemies in | 19 s |
| Nuke | 800 damage in a 14 m blast | 35 s |

The Armory shows damage, rate, magazine, range, radius, freeze, burn and pull values on each card. Seven starter weapons are unlocked from the first run; the rest are bought with Salvage. Loadout persists between runs and squad sessions.

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

## The thirteen bosses

Boss order: 5 The Jailer, 10 Bone Maw, 15 The Grinning One, 20 Abyssal Kraken, 25 Void Colossus, 30 The Butcher King, 35 Crimson Maelstrom, 40 The Rainmaker, 45 Aureole, 50 The Brood Queen, 55 The Mirrored, 60 Umbra, 65 The Collector, then the cycle repeats.

| Boss | Style |
| --- | --- |
| **The Jailer** | Orbiting sentinel fortress; radial barrage + aimed bursts. |
| **Bone Maw** | Huge undead dinosaur; charges, bites and roars shockwave blasts. |
| **The Grinning One** | Floating horror clown; confetti projectiles, mallet, summons Cacklers. |
| **Abyssal Kraken** | Giant tentacled horror; radial ink bolts and summoned Hell Monkeys. |
| **Void Colossus** | Cosmic armoured titan; dense energy fans and a summon phase. |
| **The Butcher King** | Fast melee tyrant; rushdown bursts and brutal energy. |
| **Crimson Maelstrom** | Red symbiote boss; tendril rings, lunges and monkey summons. |
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
  weapons.ts            eighteen primaries, procedural gun builders + AKM viewmodel
  bombs.ts              eleven bomb definitions and effects
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
