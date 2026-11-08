# Progression, Retention & Monetization Plan

## What is already implemented

- **Salvage economy** — every kill, wave clear, boss and completed run pays
  Salvage. Harder difficulties pay more.
- **Weapon unlocks** — Viper 600, ARX 1,200, Scatter 1,800, Longshot 2,600,
  Rail 4,000. Locked guns are greyed out in the Armory until purchased.
- **Daily 2x run** — the first run of each day pays double Salvage and builds a
  streak. The menu shows a "DAILY BONUS READY" chip.
- **Next-unlock progress** — the game-over screen shows Salvage earned, the next
  weapon and a progress bar toward it.
- **Two-button controls** — hold FIRE to charge a stronger special bomb, tap
  RELOAD to top up. No third combat button.

## Recommended monetization (do not sell power)

1. **Cosmetic skins** — weapon finishes, tracers, muzzle flashes, reticles and
   armor palettes. These do not change damage or hitboxes.
2. **Season pass** — free track gives Salvage and a base skin; paid track gives
   extra cosmetics, XP boosts and cosmetic variants.
3. **Starter pack** — one-time bundle: a cosmetic rifle finish, 1,500 Salvage
   and a profile badge.
4. **Optional rewarded ads** — "watch to double this run's Salvage" or
   "watch for +75 Salvage". Always opt-in. Never interrupt gameplay.
5. **Founder's pack** — cosmetic tag card, underground arena skin and a badge.
   No gameplay advantage.

Avoid: selling weapons with better stats, loot boxes with gameplay items,
pay-to-win damage boosts, forced ads, or ads during a run.

## Integration path

### In-app purchases (iOS / Android)

- Wrap the Vite build with Capacitor.
- Use **RevenueCat** (recommended) or StoreKit 2 / Google Play Billing.
- Products: `starter_pack`, `season_pass`, `salvage_1500`, `skin_*`.
- Validate receipts server-side. Never trust the client.
- Keep a restore-purchases button and show local prices from the store.

### Rewarded ads

- Use AdMob / Unity Ads / AppLovin MAX behind a single `ads.ts` adapter.
- Show only after the player taps "WATCH AD".
- Grant Salvage in a server-verified callback when possible.
- Respect child-directed settings and consent (GDPR/COPPA/ATT).

### Web / PWA

- Stripe Checkout + a small license server for cosmetic packs.
- Or keep the web build as a demo and monetize only the native apps.

## Native packaging (Capacitor)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npm run build
npx cap sync
npx cap open ios      # Xcode
npx cap open android  # Android Studio
```

Permissions to add natively:

- iOS `Info.plist`: `NSCameraUsageDescription`, `NSMotionUsageDescription`,
  `NSLocationWhenInUseUsageDescription`.
- Android `AndroidManifest.xml`: `CAMERA`, `ACCESS_FINE_LOCATION`,
  `VIBRATE`, and camera/AR features.
- iOS requires HTTPS for camera access; Capacitor serves the app from
  `capacitor://localhost` which is treated as secure.
- For true world occlusion and plane anchoring, add ARKit/ARCore through a
  native plugin; the web build can only use the raw camera feed.

## Metrics to watch

- D1 / D7 retention
- Runs per session
- Median time to first weapon unlock
- Wave reached per run
- Next-unlock conversion rate
- Rewarded-ad opt-in rate
- Cosmetic attach rate (paid)
- Crash/restart rate on low-memory phones

## Store listing positioning

"Real-life AR wave shooter. No headset. No controller. Point your phone, hold
FIRE and survive the invasion. Unlock six weapons, eleven bosses and a daily
streak."

Keep the first screenshot as live gameplay, the second as the Armory with a
locked gun and the unlock bar, and the third as a boss.
