# PharmaFlow · Circular Care OS

Self-contained React + Node application for cheaper generic medicine delivery, expiry recovery, donation, safe bio-disposal, blood donation, and reverse logistics. It has no hosted database or cloud authentication dependency.

## Run locally

```bash
npm install
npm run server
npm run dev
```

Use the role tabs and presenter controls above the app to preview the Customer, Chemist, Rider, and Admin interfaces. The browser preview persists to `localStorage` and synchronizes tabs through `BroadcastChannel`. Customer checkout and blood donation also POST to the local API at `http://localhost:8787`; the browser state remains available as a fallback if the API is stopped.

## Local REST engine

```bash
npm run server
```

The dependency-free service listens on `http://localhost:8787`, creates `server/pharmaflow.json` on first run, and exposes `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/catalog`, `/api/orders`, `/api/blood-donations`, and `/api/audit`. Passwords are scrypt-hashed and sessions use opaque tokens. The persisted store contains `users`, `store_profiles`, `medicines_inventory`, `orders_and_logistics`, `blood_donations`, and `user_wallets_and_rewards` collections.

Demo accounts all use password `demo123`:

| Role | Email |
| --- | --- |
| Customer | customer@pharmaflow.local |
| Chemist | chemist@pharmaflow.local |
| Rider | rider@pharmaflow.local |
| Admin | admin@pharmaflow.local |
