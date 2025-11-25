# Fix Worklets Version Mismatch Error

## The Error
```
ERROR [runtime not ready]: WorkletsError: [Worklets] Mismatch between JavaScript part and native part of Worklets (0.6.1 vs 0.5.1).
```

## Solution

### Step 1: Stop the Expo Development Server
Press `Ctrl+C` in the terminal where Expo is running.

### Step 2: Clear Expo Cache and Restart
```bash
cd mobile-app
npx expo start --clear
```

Or if using npm:
```bash
npm start -- --clear
```

### Step 3: Reload the App in Expo Go
- Shake your device (or press `Cmd+D` on iOS simulator / `Cmd+M` on Android emulator)
- Tap "Reload" or press `r` in the terminal

### Step 4: If Still Not Working - Full Reset
```bash
# Clear all caches
rm -rf node_modules
rm -rf .expo
rm -rf ios/build android/build  # if exists

# Reinstall dependencies
npm install

# Clear Expo cache and restart
npx expo start --clear
```

### Step 5: If Using Development Build (Not Expo Go)
If you're using a development build instead of Expo Go, you need to rebuild:
```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android
```

## Why This Happens
- Expo Go has a pre-built version of react-native-reanimated
- Your JavaScript bundle has a different version
- Clearing cache forces Expo to rebuild with matching versions

## Prevention
- Always use `npx expo start --clear` after updating react-native-reanimated
- Consider using a development build for production apps to avoid version mismatches

