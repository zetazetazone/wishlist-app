# Wishlist App Scripts

Scripts to manage the Expo development environment and prevent bundling issues.

## Available Scripts

### `npm run clean`
Cleans all caches and stops running processes. Use this when you encounter bundling issues.

```bash
npm run clean
```

What it does:
- Stops all running Expo and Metro processes
- Clears Metro bundler cache (.expo, node_modules/.cache)
- Clears system temp files (/tmp/metro-*, /tmp/react-*)
- Clears Watchman cache (if installed)

### `npm run start:fresh`
Runs a full cleanup and starts Expo with a fresh cache. **Use this when the app gets stuck bundling.**

```bash
npm run start:fresh
```

What it does:
- Runs the clean script
- Waits for processes to terminate
- Starts Expo with --clear flag

### `npm start`
Standard Expo start (no cache clearing). Use this for normal development.

```bash
npm start
```

## When to Use Each Script

- **Normal Development**: `npm start`
- **App Won't Bundle**: `npm run start:fresh`
- **Just Clean Caches**: `npm run clean`

## Troubleshooting

If you still encounter bundling issues after `npm run start:fresh`:

1. Check for port conflicts: `lsof -i :8081` or `lsof -i :19000`
2. Kill the process: `kill -9 <PID>`
3. Try again: `npm run start:fresh`

## Preventing Bundling Issues

The app is configured to automatically clear caches on startup via `metro.config.js`. However, if you make changes and the app doesn't reload:

1. Press `r` in the Expo terminal to reload
2. If that doesn't work, use `npm run start:fresh`
