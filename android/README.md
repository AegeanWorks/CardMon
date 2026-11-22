# CardMon Android companion

A minimal WebView app that loads the CardMon web app from the **local sync
server** running on your PC. Because the page is served from the same origin as
the sync API, the web app's sync client connects automatically.

## First run

1. On the PC, start the sync server: double-click `start-server.cmd` or run
   `npm start` in the project root.
2. Install the APK. On first launch it sends **one** UDP broadcast to find the
   server automatically and connects — no IP typing needed.
3. If discovery fails, tap **Sunucuyu Otomatik Bul** to retry or enter the LAN
   address manually (e.g. `http://192.0.2.10:8765`). Both devices must be on
   the same Wi-Fi network (guest Wi-Fi / AP isolation blocks discovery).

The server address can be changed at any time with the **Sunucu Ayarları**
button in the app's top bar.

Discovery is passive and on-demand: the server only answers a broadcast on UDP
port `8766`, and the app does not run a background scanner. Sync itself is also
manual by default — enable *Auto-sync* in the web app only if you want
continuous uploading.

## App capabilities

The app is a full WebView client for the CardMon web app, so the Money Timing,
FX/inflation, memur zammı, campaign router, sync and APK-build screens all work
inside it. Native bridges cover the browser APIs WebView lacks:

- exports (JSON/CSV/backup) and the built APK are saved to **Downloads**;
- **import backup** opens the Android file picker;
- **PDF report** uses the system print dialog;
- campaign "official link" pop-ups stay in the same tab.

The **APK** button in the native top bar opens the mobile download page directly;
it shows a confirmation after saving and has a **Back to CardMon** link. The page
also adapts to narrow screens and notched displays.

## Building the APK

From the project root:

```bash
npm run build:apk
```

Or from the website: open **Sync & Mobil → Build Android APK**. Both paths use
`gradlew assembleDebug` and copy the result to `dist/cardmon-debug.apk`.

Requirements: JDK 17+, Android SDK platform `android-35`, build-tools `35.0.0`.
Set `ANDROID_HOME` if the SDK is not in the default location
(`%LOCALAPPDATA%\Android\Sdk` on Windows).
