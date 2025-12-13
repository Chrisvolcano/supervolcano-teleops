const { google } = require('googleapis');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const email = envFile.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL=(.+)/)?.[1]?.trim();
const key = envFile.match(/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="?(.+)"?/s)?.[1]?.trim().replace(/\\n/g, '\n').replace(/^"|"$/g, '');

async function test() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  
  const drive = google.drive({ version: 'v3', auth });
  
  // Test 1: List shared drives the service account can see
  console.log('=== Shared Drives accessible ===');
  const drives = await drive.drives.list({ pageSize: 10 });
  console.log(drives.data.drives || 'None');
  
  // Test 2: Try to access the specific shared drive
  console.log('\n=== Trying to access Shared Drive ===');
  try {
    const driveInfo = await drive.drives.get({ driveId: '0AOVpzBxSWowjUk9PVA' });
    console.log('Success:', driveInfo.data.name);
  } catch (err) {
    console.log('Error:', err.message);
  }
  
  // Test 3: Try to list files in the shared drive
  console.log('\n=== Files in Shared Drive ===');
  try {
    const files = await drive.files.list({
      corpora: 'drive',
      driveId: '0AOVpzBxSWowjUk9PVA',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: 5,
    });
    console.log(files.data.files?.map(f => f.name) || 'No files');
  } catch (err) {
    console.log('Error:', err.message);
  }
  
  // Test 4: Try the specific folder
  console.log('\n=== Specific folder access ===');
  try {
    const folder = await drive.files.get({
      fileId: '1t26VeRCKklGGh9vT5aTGaZ7OGezxekOH',
      supportsAllDrives: true,
    });
    console.log('Success:', folder.data.name);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

test().catch(console.error);
