# /downloads

The green **Download APK** button in the navbar looks for a file here named:

```
app-release.apk
```

Drop your signed Android APK into this folder with that exact name and the
button will start downloading it immediately — no code changes needed.

### Don't have an APK yet?

A-DevTools is now a valid installable PWA (see `manifest.webmanifest` and
`service-worker.js` in the project root), so you can generate a real, signed
Android APK or AAB for free, with no Android Studio or coding required:

1. Deploy this site somewhere with HTTPS (or use `localhost` while testing).
2. Go to **https://www.pwabuilder.com** and enter the site's URL.
3. PWABuilder scores the PWA, then lets you download an Android package
   (APK/AAB) built from your manifest + service worker + icons.
4. Rename the file to `app-release.apk` and place it in this folder.

If the button is clicked before a real file is here, it shows a modal with
these same instructions instead of a broken download.
