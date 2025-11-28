# Firebase Storage Rules - Quick Fix

## The Problem

You're getting `storage/unauthorized` errors because Firebase Storage rules are blocking uploads.

## Quick Fix (Temporary - For Testing)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **super-volcano-oem-portal**
3. Go to **Storage** → **Rules** tab
4. Replace the rules with this (temporary, less secure):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow all reads and writes (TEMPORARY - for testing only)
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

5. Click **Publish**
6. Try uploading again

## Production Rules (After Testing)

Once uploads work, switch to these more secure rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload to media folder
    match /media/{allPaths=**} {
      allow read: if true; // Public read for robot access
      allow write: if request.auth != null; // Only authenticated users can upload
    }
    
    // Deny all other paths
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Why This Happens

Firebase Storage has default rules that deny all access. You need to explicitly allow uploads. The temporary rules above allow anyone to upload (for testing), while the production rules require authentication.

## After Updating Rules

1. Rules take effect immediately (no redeploy needed)
2. Try uploading your video again
3. The upload should work now

