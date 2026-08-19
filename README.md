# impossible-travel-guard

Flag a login as suspicious when it implies physically impossible travel speed from the account's previous login. No geolocation API, including IPGeolocation.io, ships this check as a built-in feature. They give you a location for one IP. This library does the part after that: store the last login, compare it to the new one, and tell you if a human could not plausibly have made that trip.

It is one of the few account-takeover signals that compares a user against their own history instead of a blacklist, so it works even when both IP addresses look perfectly clean on their own.

```
New York login at 09:00
Lagos login at 09:40
8,400 km apart, 40 minutes apart, implied speed 12,000+ km/h
=> flagged
```

## Why this exists

Most fraud content (including guides on IP-based fraud detection) describes this exact pattern: store each login's location and timestamp, compute distance and elapsed time, flag anything faster than a plane could manage. Every write-up describes the logic. None of them ship the code. This package is that missing piece, small, dependency-free, and provider-agnostic, it takes latitude/longitude from wherever you already get them.

## Install

```bash
npm install impossible-travel-guard
```

## Quick start

```ts
import { TravelGuard } from "impossible-travel-guard";

const guard = new TravelGuard(); // in-memory store by default

const result = await guard.check({
  userId: "user_123",
  latitude: 6.5244,
  longitude: 3.3792,
  timestamp: Date.now(),
});

if (result.flagged) {
  // require MFA, send an alert, or hold the session for review
  // do not hard-block on this signal alone, see "How to act on a flag" below
}
```

The first login for any `userId` is never flagged, there is nothing to compare it to yet. It is just recorded as the baseline.

## Getting latitude/longitude from an IP

This library does not call any geolocation API itself, on purpose, so it works with whatever provider you already have. If you don't have one, `examples/ipgeolocation-adapter.ts` shows a working example using [IPGeolocation.io's IP location API](https://ipgeolocation.io/ip-location-api.html), free tier covers the lookup this needs.

```ts
import { loginEventFromIp } from "./examples/ipgeolocation-adapter";

const event = await loginEventFromIp(userId, req.ip);
const result = await guard.check(event);
```

## Configuration

```ts
new TravelGuard({
  maxPlausibleSpeedKmh: 1000, // default, comfortably above commercial flight speed
  minDistanceKm: 50,          // default, ignores GPS/IP jitter within the same metro area
  store: myCustomStore,       // default is an in-memory Map, see below
});
```

Tune `maxPlausibleSpeedKmh` down if your users are not typically international travelers, or up if you'd rather only catch the most extreme cases.

## Storage

The default `MemoryStore` works for a demo or a single-process app, and loses everything on restart. For production, implement the two-method `LoginStore` interface against Redis, Postgres, or whatever you already run:

```ts
import { LoginStore, LoginEvent } from "impossible-travel-guard";

class RedisStore implements LoginStore {
  async getLastLogin(userId: string): Promise<LoginEvent | null> {
    const raw = await redis.get(`last_login:${userId}`);
    return raw ? JSON.parse(raw) : null;
  }
  async saveLogin(event: LoginEvent): Promise<void> {
    await redis.set(`last_login:${event.userId}`, JSON.stringify(event));
  }
}

const guard = new TravelGuard({ store: new RedisStore() });
```

## How to act on a flag

Treat a flag as a prompt for step-up verification, not an automatic block. Real users hop networks, use VPNs, or have their IP misresolved by CGNAT often enough that a hard block on this signal alone will lock out legitimate accounts. Reasonable responses, in order of severity: log it, email the user, require MFA, hold the session for manual review. Reserve an outright block for when this signal stacks with others (new device, new browser fingerprint, password reset requested minutes earlier).

## What this does not do

This is one signal, not a fraud engine. It has no opinion on VPNs, proxies, device fingerprints, or IP reputation, pair it with those if you need them. It also cannot tell you why a trip is impossible, just that it is, a shared corporate VPN egress point flipping between two data centers can trigger a false positive too. Log enough context to review flags by hand until you trust your thresholds.

## Development

Clone the repo, install dependencies, then build and test:

\`\`\`bash
git clone https://github.com/Furqan-Ashraf/impossible-travel-guard.git
cd impossible-travel-guard
npm install
npm run build
npm test
\`\`\`

All 5 tests should pass (same-city logins ignored, plausible flights pass, physically impossible sequences flagged). Tests live in `test/travelGuard.test.ts` and run on Node's built-in test runner via `tsx`, no extra test framework to install.

## API

### `new TravelGuard(options?)`

See Configuration above.

### `guard.check(event: LoginEvent): Promise<CheckResult>`

| Field | Type | Meaning |
| :-- | :-- | :-- |
| `flagged` | boolean | Whether this login was flagged |
| `reason` | string | `first_login`, `ok`, `too_close_to_matter`, or `impossible_travel` |
| `distanceKm` | number \| null | Distance from the previous login |
| `elapsedHours` | number \| null | Time since the previous login |
| `impliedSpeedKmh` | number \| null | `distanceKm / elapsedHours` |
| `previousLogin` | LoginEvent \| null | The login this was compared against |
| `currentLogin` | LoginEvent | The event that was just checked |

## License

MIT
#
