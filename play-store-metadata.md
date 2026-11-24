# Google Play Store Upload Metadata & Asset Guide

## Application Details
- **App Name**: Neon Snake Android
- **Package Name**: `com.devekene.neonsnake`
- **Version Name**: `1.0.0`
- **Version Code**: `1`

---

## 1. Store Descriptions

### Short Description (Max 80 characters)
> Retro neon arcade snake game with touch D-pad, high scores & offline leaderboard!

### Long Description (Full Store Listing)
> Experience the ultimate retro arcade classic reimagined with stunning cyberpunk neon aesthetics and modern touch controls! Neon Snake Android is crafted from the ground up for mobile gamers who love nostalgic arcade action, fast-paced challenges, and fierce competition.
>
> ### Key Features:
> • **Responsive Mobile Touch Controls**: Play effortlessly using intuitive on-screen touch D-pad buttons or smooth swipe gestures.
> • **Retro Neon Visuals**: Immerse yourself in glowing cyber grids, customizable neon color themes (Cyan, Green, Magenta, Amber), and crisp arcade typography.
> • **Progressive Difficulty**: As your snake grows longer with every consumed apple, the game speed ramps up to test your reflexes and strategic positioning.
> • **Persistent Local Leaderboard**: Compete against yourself and friends! Save your high scores offline to the persistent local leaderboard without needing an account.
> • **Synthesized Audio Effects**: Enjoy retro arcade sound effects powered by the Web Audio API (with instant mute toggle).
> • **Fully Offline Ready**: Play anywhere, anytime without connectivity constraints.
>
> Download Neon Snake Android today and claim your spot at the top of the leaderboard!

---

## 2. Store Graphic Assets Generated
- **App Icon (512 x 512 px)**: `/src/assets/images/app_icon_512_1795520149288.jpg`
- **Feature Graphic Banner (1024 x 500 px)**: `/src/assets/images/feature_banner_1024_1795520149346.jpg`

---

## 3. Build & Bundle Instructions for Google Play (.apk & .aab)

To package this web application into an Android App Bundle (`.aab`) and APK for Google Play Console upload, you can use **Capacitor** or **Cordova**, or wrap it as a PWA / Trusted Web Activity (TWA) via Bubblewrap:

### Option A: Using Capacitor (Recommended)
1. Initialize Capacitor in the project:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init "Neon Snake Android" com.devekene.neonsnake
   ```
2. Build the web app bundle:
   ```bash
   npm run build
   ```
3. Add the Android platform:
   ```bash
   npm install @capacitor/android
   npx cap add android
   ```
4. Open Android Studio to build the signed App Bundle (`.aab`) for Play Store:
   ```bash
   npx cap open android
   ```
   - In Android Studio: Go to **Build > Build Bundle(s) / APK(s) > Build Bundle(s) (AAB)**.

### Option B: Using Google Bubblewrap (Trusted Web Activity)
1. Install Bubblewrap CLI:
   ```bash
   npm i -g @bubblewrap/cli
   ```
2. Initialize and build the TWA project pointing to your hosted web app URL to generate the `.aab` file ready for Google Play Console upload.
