# Realism Notes

## What shipped now

- PBR environment lighting (`RoomEnvironment`), ACES tone mapping and emissive bloom.
- Clearcoat on armour and weapons.
- Procedural skin/cloth grain maps plus a sheen + light clearcoat pass on organic
  materials.
- A cool character fill light on the camera so skin, cloth and armour keep detail
  when the phone camera feed is dark.
- Blob/contact shadows for ground and air units, plus rotor blur on helicopters and
  glowing engine flames on jets/starships.

This is a stylised-realistic look built for mobile browser budgets. It is not a
photoreal scan.

## Why full photoreal characters are not enabled by default

A single photoreal CC0 human is much heavier than the rest of the app:

| Source | Asset | Approx. size |
| --- | --- | --- |
| [VitruvianGodot](https://github.com/ibrews/VitruvianGodot) | body + head + textures | ~16 MB before hair (hair is ~38 MB) |
| [Grab3D](https://grab3d.com/free-rigged-3d-models/) | high-detail rigged human | 18–28 MB per model |
| [3d-gen / Ara](https://github.com/olatunde85/3d-gen) | MakeHuman export | ~85 MB generated asset pack |

The current game is ~14 MB total. Adding even one scanned human would more than
double the download and memory footprint, and iOS Safari may reload the tab under
memory pressure. That trades "photoreal" for a worse experience on the phones this
game targets.

## If you want photoreal characters

1. Generate or pick a character from one of the sources above.
2. Decimate to 10–20k triangles and resize textures to 1024 px (or 2048 px on the
   hero boss only).
3. Export a GLB with embedded textures and a single humanoid skeleton.
4. Add it to `src/assets.ts`, then use `buildGlbModel(key, height)` in
   `src/enemies.ts`.
5. Keep it as a **single boss or hero enemy** rather than replacing every mob.

The model pipeline is already generic: any rigged GLB with `idle`/`walk`/`run`/
`attack`/`death` clips will play automatically.

## Realistic look checklist

- Skin: albedo + roughness + normal + subtle SSS/clearcoat.
- Cloth: sheen, high roughness, normal map.
- Metal: low roughness, clearcoat, environment reflections.
- Eyes: dark, glossy, small specular.
- Lighting: key + cool rim + environment; avoid flat ambient-only lighting.
- Animation: idle breathing, weight shift, hit flinch and death beats matter more
  than polygon count for perceived realism.
