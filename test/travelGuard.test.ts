import assert from "node:assert/strict";
import { test } from "node:test";
import { TravelGuard } from "../src/travelGuard";

const HOUR = 1000 * 60 * 60;

test("first login is never flagged", async () => {
  const guard = new TravelGuard();
  const result = await guard.check({
    userId: "u1",
    latitude: 40.7128,
    longitude: -74.006, // New York
    timestamp: Date.now(),
  });
  assert.equal(result.flagged, false);
  assert.equal(result.reason, "first_login");
});

test("same-city second login is not flagged", async () => {
  const guard = new TravelGuard();
  const t0 = Date.now();
  await guard.check({ userId: "u2", latitude: 40.7128, longitude: -74.006, timestamp: t0 });
  const result = await guard.check({
    userId: "u2",
    latitude: 40.73,
    longitude: -73.99, // a few km away, same city
    timestamp: t0 + HOUR,
  });
  assert.equal(result.flagged, false);
  assert.equal(result.reason, "too_close_to_matter");
});

test("New York to Lagos in 40 minutes is flagged", async () => {
  const guard = new TravelGuard();
  const t0 = Date.now();
  await guard.check({ userId: "u3", latitude: 40.7128, longitude: -74.006, timestamp: t0 }); // New York
  const result = await guard.check({
    userId: "u3",
    latitude: 6.5244,
    longitude: 3.3792, // Lagos
    timestamp: t0 + 40 * 60 * 1000,
  });
  assert.equal(result.flagged, true);
  assert.equal(result.reason, "impossible_travel");
  assert.ok(result.impliedSpeedKmh && result.impliedSpeedKmh > 1000);
});

test("New York to London 8 hours later is not flagged (plausible flight)", async () => {
  const guard = new TravelGuard();
  const t0 = Date.now();
  await guard.check({ userId: "u4", latitude: 40.7128, longitude: -74.006, timestamp: t0 });
  const result = await guard.check({
    userId: "u4",
    latitude: 51.5072,
    longitude: -0.1276, // London
    timestamp: t0 + 8 * HOUR,
  });
  assert.equal(result.flagged, false);
  assert.equal(result.reason, "ok");
});

test("custom thresholds are respected", async () => {
  const strictGuard = new TravelGuard({ maxPlausibleSpeedKmh: 100 });
  const t0 = Date.now();
  await strictGuard.check({ userId: "u5", latitude: 40.7128, longitude: -74.006, timestamp: t0 });
  const result = await strictGuard.check({
    userId: "u5",
    latitude: 41.8781,
    longitude: -87.6298, // Chicago, plausible by car over a day, not at 100km/h cap over 1h
    timestamp: t0 + HOUR,
  });
  assert.equal(result.flagged, true);
});
