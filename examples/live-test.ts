/**
 * Run this to see the whole flow with REAL IP addresses and a REAL
 * IPGeolocation.io API key, no fake city coordinates, no demo data.
 *
 * This is exactly what a sign-in form's backend would do: take the IP of
 * each login, resolve it to a real location, then check it.
 *
 * Setup:
 *   1. Get a free key at https://ipgeolocation.io (free tier covers this)
 *   2. Set it as an environment variable, do not hardcode it anywhere:
 *        Windows PowerShell:  $env:IPGEO_API_KEY="your-key-here"
 *        Mac/Linux:           export IPGEO_API_KEY="your-key-here"
 *
 * Run:
 *   npx tsx examples/live-test.ts <ip1> <ip2> <minutesApart>
 *
 * Example, a real login from a US IP, then 40 minutes later from a
 * Nigerian IP, mirrors the README's New York -> Lagos example but with
 * two real, resolvable IP addresses instead of hardcoded coordinates:
 *
 *   npx tsx examples/live-test.ts 8.8.8.8 197.210.28.1 40
 */
import { TravelGuard } from "../src";
import { loginEventFromIp } from "./ipgeolocation-adapter";

async function main() {
  const [ip1, ip2, minutesArg] = process.argv.slice(2);

  if (!ip1 || !ip2) {
    console.error(
      "Usage: npx tsx examples/live-test.ts <ip1> <ip2> <minutesApart>\n" +
        "Example: npx tsx examples/live-test.ts 8.8.8.8 197.210.28.1 40"
    );
    process.exit(1);
  }

  const minutesApart = minutesArg ? parseFloat(minutesArg) : 40;
  const userId = "live-test-user";
  const guard = new TravelGuard();

  console.log(`Resolving ${ip1} ...`);
  const event1 = await loginEventFromIp(userId, ip1);
  // Backdate this one so event2 lands "minutesApart" after it.
  event1.timestamp = Date.now() - minutesApart * 60 * 1000;
  const firstCheck = await guard.check(event1);
  console.log(
    `  -> lat ${event1.latitude}, lon ${event1.longitude} (recorded as baseline, reason: ${firstCheck.reason})`
  );

  console.log(`Resolving ${ip2} ...`);
  const event2 = await loginEventFromIp(userId, ip2);
  const secondCheck = await guard.check(event2);
  console.log(
    `  -> lat ${event2.latitude}, lon ${event2.longitude}`
  );

  console.log("\n--- Result ---");
  console.log(`Distance:       ${secondCheck.distanceKm?.toFixed(0)} km`);
  console.log(`Time apart:     ${minutesApart} minutes`);
  console.log(`Implied speed:  ${secondCheck.impliedSpeedKmh?.toFixed(0)} km/h`);
  console.log(`Reason:         ${secondCheck.reason}`);
  console.log(`Flagged:        ${secondCheck.flagged ? "YES, would require step-up verification" : "no"}`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
