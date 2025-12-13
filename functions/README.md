# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the SuperVolcano platform.

## Functions

### `scheduledDriveSync`

Automatically syncs all Google Drive sources every 15 minutes. Scans folders recursively to count video files and calculate storage statistics.

**Schedule**: Runs every 15 minutes via Cloud Scheduler

**What it does**:
- Fetches all Drive sources from Firestore
- Recursively scans each folder and subfolders
- Counts video files and calculates total size
- Updates Firestore with latest statistics
- Logs errors for failed syncs

### `manualDriveSync`

Callable function for manually triggering a Drive sync from the dashboard.

**Authentication**: Requires admin or superadmin role

**Usage**:
```javascript
const functions = getFunctions();
const syncDrive = httpsCallable(functions, 'manualDriveSync');
await syncDrive({ folderId: 'your-folder-id' });
```

## Setup

1. **Install dependencies**:
   ```bash
   cd functions
   npm install
   ```

2. **Configure environment variables**:
   
   Set in Firebase Functions config:
   ```bash
   firebase functions:config:set google.service_account_email="your-service-account@project.iam.gserviceaccount.com"
   firebase functions:config:set google.service_account_private_key="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   
   Or use environment variables (Firebase Functions v2):
   ```bash
   firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
   firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
   ```

3. **Build**:
   ```bash
   npm run build
   ```

4. **Deploy**:
   ```bash
   firebase deploy --only functions
   ```

## Development

### Local Testing

1. **Start emulator**:
   ```bash
   npm run serve
   ```

2. **Test scheduled function**:
   - The emulator will run scheduled functions automatically
   - Or trigger manually via the Firebase Console

3. **Test callable function**:
   ```javascript
   const functions = getFunctions();
   const syncDrive = httpsCallable(functions, 'manualDriveSync');
   const result = await syncDrive({ folderId: 'test-folder-id' });
   ```

### Viewing Logs

```bash
firebase functions:log
```

Or view in Firebase Console → Functions → Logs

## Configuration

### Schedule

The scheduled function runs every 15 minutes. To change the schedule, update the cron expression in `scheduledDriveSync.ts`:

```typescript
functions.pubsub.schedule('every 15 minutes')  // Change this
```

Cron format examples:
- `every 15 minutes`
- `every 1 hours`
- `every day 00:00`
- `0 */6 * * *` (every 6 hours)

### Timeout

Default timeout is 60 seconds. For large folders, you may need to increase:

```typescript
export const scheduledDriveSync = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .pubsub.schedule('every 15 minutes')
  .onRun(async (context) => {
    // ...
  });
```

## Troubleshooting

### "Permission denied" errors

- Verify the service account email has access to the Drive folders
- Check that folders are shared with the service account (Viewer access)

### "API not enabled" errors

- Ensure Google Drive API is enabled in Google Cloud Console
- Check API quotas haven't been exceeded

### Timeout errors

- Increase function timeout (see Configuration above)
- Consider breaking large folders into smaller ones
- Check function logs for specific errors

### Build errors

- Ensure TypeScript is installed: `npm install -g typescript`
- Check `tsconfig.json` is correct
- Verify all dependencies are installed: `npm install`

## Monitoring

View function execution in Firebase Console:
- **Functions** → **scheduledDriveSync** → **Logs**
- **Functions** → **manualDriveSync** → **Logs**

Monitor for:
- Execution frequency (should be every 15 minutes)
- Success/failure rates
- Execution duration
- Error messages

