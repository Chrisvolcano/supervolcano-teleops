# Package Installation Automation

## Auto-Commit Package Files

To prevent EAS build failures from out-of-sync `package-lock.json`, we have automated scripts that commit package files after installation.

## Usage

### Option 1: Use npm scripts (Recommended)

```bash
# Install a package and auto-commit
npm run install:save expo-constants

# Install dev dependency and auto-commit
npm run install:save-dev @types/package-name

# Install any package and auto-commit
npm run install:auto expo-camera
```

### Option 2: Use the script directly

```bash
# Install and auto-commit
./scripts/install-and-commit.sh expo-constants

# With flags
./scripts/install-and-commit.sh --save-dev @types/react
```

### Option 3: Manual (if you forget)

If you use regular `npm install`, remember to commit:

```bash
npm install expo-constants
git add package.json package-lock.json
git commit -m "chore: Update package-lock.json after installing expo-constants"
git push
```

## What It Does

1. Runs `npm install` with your arguments
2. Checks if `package.json` or `package-lock.json` changed
3. If changed, automatically:
   - Stages both files
   - Creates a commit with descriptive message
   - Reminds you to push

## Git Hook

A `post-merge` hook is installed that checks package files after pulling changes. It will warn you if the lock file might be out of sync.

## Why This Matters

EAS builds require `package-lock.json` to be in sync with `package.json`. If they're out of sync, builds will fail with errors like:

```
@react-native-async-storage/async-storage@1.24.0 is missing from lock file
```

**Always commit package files after installing packages!**

