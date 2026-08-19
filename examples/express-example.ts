/**
 * Minimal Express example. Wire this into your existing login route,
 * after you've verified the password/OTP, before you issue a session.
 */
import express from "express";
import { TravelGuard } from "../src";
import { loginEventFromIp } from "./ipgeolocation-adapter";

const app = express();
const guard = new TravelGuard(); // in-memory store, swap for Redis in production

app.post("/login", async (req, res) => {
  // ... your existing password/OTP verification happens above this line ...

  const userId = req.body.userId;
  const ip = req.ip;

  const event = await loginEventFromIp(userId, ip);
  const result = await guard.check(event);

  if (result.flagged) {
    // Do not hard-block on this alone, see README. Step up verification,
    // send an alert email, or require MFA before issuing the session.
    console.warn(
      `Impossible travel for user ${userId}: ${result.distanceKm?.toFixed(
        0
      )} km in ${result.elapsedHours?.toFixed(
        2
      )}h, implied speed ${result.impliedSpeedKmh?.toFixed(0)} km/h`
    );
    return res.status(403).json({ error: "additional_verification_required" });
  }

  // ... issue session / JWT / cookie as normal ...
  return res.json({ ok: true });
});

export default app;
