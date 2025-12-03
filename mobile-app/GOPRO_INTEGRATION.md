# GoPro Integration - Implementation Guide

## Status

✅ **API Endpoint Created** - `/api/sessions/[sessionId]/media` (ready to deploy)  
⏳ **Mobile App Services** - Foundation structure ready (requires device testing)  
⏳ **UI Components** - Structure ready (requires device testing)

---

## Overview

This integration enables automatic GoPro recording during cleaning sessions with:
- One-time Bluetooth pairing
- Auto-connect on app open
- Auto-start recording on "Start Cleaning"
- **5-minute auto-segmenting**
- **Background upload while recording continues**
- Auto-stop on "Complete"

---

## Prerequisites

### 1. Native Build Required

⚠️ **This CANNOT run in Expo Go** - requires a development build:

```bash
cd mobile-app
npx expo prebuild
npx expo run:ios    # or run:android
```

### 2. Required Dependencies

```bash
cd mobile-app

# BLE library (requires native code)
npx expo install react-native-ble-plx

# Background tasks
npx expo install expo-background-fetch expo-task-manager

# Already installed: @react-native-async-storage/async-storage
```

### 3. Device Testing Required

- Physical iOS/Android device
- GoPro camera (HERO 8 or newer recommended)
- Bluetooth enabled
- WiFi network for media transfer

---

## API Endpoint (✅ COMPLETE)

**File:** `src/app/api/sessions/[sessionId]/media/route.ts`

**Status:** ✅ Ready to deploy

**Endpoints:**
- `POST /api/sessions/[sessionId]/media` - Upload video segment
- `GET /api/sessions/[sessionId]/media` - List all segments

**Features:**
- Authenticates user
- Uploads to Firebase Storage
- Creates Firestore records
- Supports base64-encoded video data

---

## Mobile App Implementation Status

### Phase 1: Foundation Structure ⏳

The following files need to be created/finalized:

1. **`mobile-app/app.json`** - Add Bluetooth permissions (see below)
2. **`mobile-app/src/services/gopro.service.ts`** - BLE + WiFi communication
3. **`mobile-app/src/services/segmented-recording.service.ts`** - 5-min segmenting
4. **`mobile-app/src/contexts/GoProContext.tsx`** - React context
5. **`mobile-app/src/screens/settings/GoProSetupScreen.tsx`** - Pairing UI
6. **`mobile-app/src/components/GoProStatusBadge.tsx`** - Status indicator

### Phase 2: Integration ⏳

- Integrate with session start/complete handlers
- Add background upload service
- Wire up status indicators

---

## Next Steps

1. **Update app.json** with Bluetooth permissions (see below)
2. **Install dependencies** (requires native build)
3. **Create service files** using the structure from the prompt
4. **Test with physical GoPro** on iOS/Android device
5. **Deploy API endpoint** (already complete)

---

## app.json Updates Needed

Add to `mobile-app/app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-ble-plx",
        {
          "isBackgroundEnabled": true,
          "modes": ["peripheral", "central"],
          "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to your GoPro camera"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSBluetoothAlwaysUsageDescription": "SuperVolcano uses Bluetooth to connect to your GoPro camera for automatic recording",
        "NSBluetoothPeripheralUsageDescription": "SuperVolcano uses Bluetooth to connect to your GoPro camera",
        "UIBackgroundModes": ["bluetooth-central", "fetch", "processing"]
      }
    },
    "android": {
      "permissions": [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.ACCESS_FINE_LOCATION"
      ]
    }
  }
}
```

---

## Testing Checklist

- [ ] Can scan for GoPro via BLE
- [ ] Can pair and save device ID
- [ ] Auto-connects on app open
- [ ] Can start/stop recording via BLE
- [ ] Can connect GoPro to WiFi
- [ ] Can download files via HTTP from GoPro
- [ ] 5-minute auto-segmenting works
- [ ] Segments upload in background
- [ ] Recording restarts automatically after segment
- [ ] Files delete from GoPro after upload
- [ ] Works on both iOS and Android

---

## Important Notes

1. **Native Build Required** - Cannot use Expo Go
2. **Device Testing Required** - Needs physical GoPro
3. **Background Tasks** - iOS/Android have different limits
4. **WiFi Required** - For media transfer (not just BLE)

---

## API Endpoint Testing

You can test the API endpoint immediately (no device needed):

```bash
# Test upload
curl -X POST https://your-app.vercel.app/api/sessions/test-session-id/media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "segmentId": "seg-1",
    "segmentNumber": 1,
    "filename": "test.LRV",
    "data": "base64encodedvideodata...",
    "locationId": "loc-123",
    "startedAt": "2025-01-01T00:00:00Z"
  }'
```

---

## Next Implementation Session

When ready to continue:
1. Update app.json with permissions
2. Install native dependencies
3. Create GoPro service files
4. Create UI components
5. Test on physical device

