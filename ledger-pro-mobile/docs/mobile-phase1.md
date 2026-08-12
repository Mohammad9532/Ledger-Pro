# Ledger-Pro Mobile: Phase 1 Foundation

This document outlines the architecture, tooling, and infrastructure established during Phase 1 for the Ledger-Pro React Native application.

## Overview

- **Framework**: Expo Router (SDK 57)
- **Language**: TypeScript (Strict Mode)
- **Styling**: NativeWind v4 (Tailwind CSS)
- **State Management**: Zustand
- **Server State**: TanStack Query v5
- **API Client**: Axios
- **Form Handling**: React Hook Form + Zod
- **Persistence**: Expo Secure Store

## Folder Structure

The application follows a strictly feature-based architecture to ensure long-term scalability.

```
src/
├── api/            # Centralized Axios client & interceptors
├── app/            # Expo Router file-based routing
│   ├── (auth)/     # Authentication stack (Login, Register, etc.)
│   ├── (tabs)/     # Main application stack
│   └── _layout.tsx # Root layout with Query/Auth Providers
├── components/     # Reusable UI components (Buttons, Inputs, Cards)
├── config/         # Environment configuration (env.ts)
├── features/       # Domain-specific modules (business logic)
├── store/          # Zustand global state (authStore.ts)
├── types/          # Global TypeScript declarations
└── utils/          # Helper functions
```

## Environment Configuration

The application supports multiple environments via `.env` files:
- `.env.development` -> `http://<LOCAL_IP>:8000/api`
- `.env.staging` -> `https://staging.accounts.beingreal.in/api`
- `.env.production` -> `https://accounts.beingreal.in/api`

The API Base URL is resolved dynamically via `src/config/env.ts` so no code changes are required when switching environments.

## API Architecture

All network requests pass through `src/api/api.ts`.
- **Interceptors**: Automatically attach the Bearer token to all outgoing requests.
- **Error Handling**: Automatically catch `401 Unauthorized` responses and trigger a global application logout to protect the user's session.

## Authentication Flow

1. **Login/Register**: User authenticates via the Laravel Sanctum API.
2. **Persistence**: The Access Token, User data, Company, and Tenant are securely saved to the device's keychain via `expo-secure-store`.
3. **Restoration**: On app launch, `_layout.tsx` calls `restoreSession()` to verify the token. If valid, the user bypasses the Auth stack and enters the `(tabs)` dashboard.
4. **Logout**: Safely purges the secure store and resets global state, redirecting to the login screen.

## Theme System

NativeWind v4 is configured globally. We do not use inline styles.
Colors are defined in `global.css` and `tailwind.config.js` to match the premium Ledger-Pro web application (using the signature `#f97316` brand color). 
Components like `AppButton`, `AppInput`, and `AppCard` consume these tokens to maintain design consistency.

## Build Instructions

### Local Development
```bash
npm run start
```

### Build & Submit (EAS)
EAS is pre-configured via `eas.json` with Development, Preview, and Production profiles.
```bash
npx eas build --profile preview --platform android
npx eas build --profile production --platform all
```

## How to Add Future Modules

1. **Routing**: Add the screen to `src/app/(tabs)/[module]/`.
2. **State**: If global, add to `src/store/`. If server data, use TanStack Query inside the component.
3. **Logic**: Store complex domain logic in `src/features/[module]/`.
4. **UI**: Re-use `src/components/` (e.g., `AppCard`, `AppButton`).
