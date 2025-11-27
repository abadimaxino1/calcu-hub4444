# Mobile App Deployment Guide

This document explains how to package Calcu-Hub as a native mobile app for Android and iOS using Capacitor.

## Overview

Calcu-Hub is a Progressive Web App (PWA) that can be:

1. **Installed directly** from the browser ("Add to Home Screen")
2. **Wrapped as a native app** using Capacitor for distribution via App Store / Play Store

---

## PWA Installation (No Store Required)

The app is already PWA-ready. Users can install it directly:

### Android
1. Open the site in Chrome
2. Tap the menu (⋮) → "Install app" or "Add to Home Screen"
3. The app appears on the home screen with full-screen mode

### iOS
1. Open the site in Safari
2. Tap Share (↑) → "Add to Home Screen"
3. The app appears on the home screen

### PWA Requirements (Already Met)

- ✅ `manifest.webmanifest` with name, icons, theme
- ✅ Service worker for offline caching
- ✅ HTTPS (required for production)
- ✅ Icons: 192x192 and 512x512
- ✅ `display: standalone` in manifest

---

## Native App with Capacitor

For App Store / Play Store distribution, use Capacitor to wrap the web app.

### Prerequisites

- Xcode (for iOS) - macOS only
- Android Studio (for Android)
- JDK 11+ (for Android)
- CocoaPods (for iOS): `sudo gem install cocoapods`

### Step 1: Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Calcu-Hub" "com.calcuhub.app" --web-dir dist
```

### Step 2: Configure Capacitor

Edit `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.calcuhub.app',
  appName: 'Calcu-Hub',
  webDir: 'dist',
  server: {
    // For development with live reload (optional)
    // url: 'http://192.168.1.x:5173',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0ea5a4',
      showSpinner: false,
    },
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    backgroundColor: '#0ea5a4',
  },
};

export default config;
```

### Step 3: Add Platforms

```bash
# Build the web app first
npm run build

# Add Android
npx cap add android

# Add iOS (macOS only)
npx cap add ios
```

### Step 4: Sync and Build

After any changes to the web app:

```bash
npm run build
npx cap sync
```

### Step 5: Open in Native IDE

```bash
# Android
npx cap open android

# iOS
npx cap open ios
```

Then build and run from Android Studio or Xcode.

---

## App Store Assets Required

### Icons

| Platform | Size | Purpose |
|----------|------|---------|
| iOS | 1024×1024 | App Store |
| iOS | 180×180 | iPhone |
| iOS | 167×167 | iPad Pro |
| iOS | 152×152 | iPad |
| iOS | 120×120 | iPhone Spotlight |
| Android | 512×512 | Play Store |
| Android | 192×192 | Launcher |
| Android | 144×144 | Launcher (hdpi) |
| Android | 96×96 | Launcher (mdpi) |
| Android | 72×72 | Launcher (ldpi) |
| Android | 48×48 | Launcher (ldpi) |

**Tool**: Use an icon generator like https://appicon.co/ to create all sizes from a single 1024×1024 source.

### Splash Screens

| Platform | Sizes |
|----------|-------|
| iOS | Various (Xcode will generate) |
| Android | Various (Android Studio will generate) |

Use the `@capacitor/splash-screen` plugin and provide a single high-res source image.

---

## Store Listing Requirements

### Google Play Store

- **App Title**: Calcu-Hub - حاسبات الراتب
- **Short Description** (80 chars): حاسبات الراتب ونهاية الخدمة وساعات العمل للموظفين بالسعودية
- **Full Description**: (2000-4000 chars) Detailed app description
- **Feature Graphic**: 1024×500 px
- **Screenshots**: Min 2, recommended 8 (phone + tablet)
- **Privacy Policy URL**: https://yourdomain.com/privacy
- **Content Rating**: Complete the questionnaire
- **Category**: Finance / Tools

### Apple App Store

- **App Name**: Calcu-Hub - حاسبات الراتب
- **Subtitle** (30 chars): Saudi Salary & EOS Calculator
- **Description**: Detailed app description
- **Keywords**: salary,calculator,saudi,gosi,eos,راتب,حاسبة
- **Screenshots**: Required for each device size
- **Privacy Policy URL**: https://yourdomain.com/privacy
- **Support URL**: https://yourdomain.com/about
- **Category**: Finance / Utilities

---

## Required URLs for Store Submission

The following pages should be accessible publicly:

| URL | Purpose |
|-----|---------|
| `/privacy` | Privacy Policy (required) |
| `/terms` | Terms of Service |
| `/about` | About / Support page |

These routes are already implemented in the app.

---

## Native Plugins (Optional)

If you need native functionality:

```bash
# Status bar styling
npm install @capacitor/status-bar
npx cap sync

# App info
npm install @capacitor/app
npx cap sync

# Network status
npm install @capacitor/network
npx cap sync
```

---

## Updating the App

After publishing:

1. Make changes to web code
2. Increment version in `package.json` and native projects
3. Run:
   ```bash
   npm run build
   npx cap sync
   ```
4. Open native project and build new version
5. Submit to stores

---

## Testing on Device

### Android

```bash
npx cap run android
```

Or connect a device and run from Android Studio.

### iOS

```bash
npx cap run ios
```

Requires a provisioning profile for physical devices.

---

## Checklist Before Submission

### General
- [ ] App icon in all required sizes
- [ ] Splash screen configured
- [ ] Version number set correctly
- [ ] Privacy policy URL accessible

### Google Play
- [ ] Signed release APK/AAB
- [ ] Content rating completed
- [ ] Store listing complete
- [ ] Screenshots uploaded
- [ ] Data safety form completed

### App Store
- [ ] Developer account ($99/year)
- [ ] App ID registered
- [ ] Provisioning profile created
- [ ] Archive uploaded via Xcode
- [ ] App Store Connect listing complete
- [ ] Screenshots for all device sizes

---

## Cost Estimates

| Item | One-time | Annual |
|------|----------|--------|
| Apple Developer Account | - | $99 |
| Google Play Developer | $25 | - |
| Domain & Hosting | - | ~$50-100 |

---

## Alternative: TWA (Trusted Web Activity)

For Android only, you can use TWA instead of Capacitor for a lighter wrapper:

```bash
npm install @nicolo-ribaudo/pwa-builder
npx pwabuilder package
```

This creates an APK that simply wraps your PWA with minimal native code.

---

## Support

For Capacitor-specific issues:
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor GitHub](https://github.com/ionic-team/capacitor)

For store submission guides:
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect)
