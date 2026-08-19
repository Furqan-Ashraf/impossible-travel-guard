import { haversineKm } from "./haversine";
import { MemoryStore } from "./memoryStore";
import {
  CheckResult,
  LoginEvent,
  LoginStore,
  TravelGuardOptions,
} from "./types";

const DEFAULT_MAX_SPEED_KMH = 1000;
const DEFAULT_MIN_DISTANCE_KM = 50;
// Floor elapsed time at 1 second so back-to-back or out-of-order timestamps
// never divide by zero or go negative, they just produce a very high
// implied speed, which is exactly what should happen for two logins that
// claim to be seconds apart from different continents.
const MIN_ELAPSED_HOURS = 1 / 3600;

export class TravelGuard {
  private store: LoginStore;
  private maxPlausibleSpeedKmh: number;
  private minDistanceKm: number;

  constructor(options: TravelGuardOptions = {}) {
    this.store = options.store ?? new MemoryStore();
    this.maxPlausibleSpeedKmh =
      options.maxPlausibleSpeedKmh ?? DEFAULT_MAX_SPEED_KMH;
    this.minDistanceKm = options.minDistanceKm ?? DEFAULT_MIN_DISTANCE_KM;
  }

  /**
   * Checks one login event against the user's last known login.
   * Always records the current event as the new "last login" for next
   * time, even when it is flagged, so a confirmed-legitimate location
   * does not keep tripping false positives against a stale one.
   */
  async check(event: LoginEvent): Promise<CheckResult> {
    const previous = await this.store.getLastLogin(event.userId);

    if (!previous) {
      await this.store.saveLogin(event);
      return {
        flagged: false,
        reason: "first_login",
        distanceKm: null,
        elapsedHours: null,
        impliedSpeedKmh: null,
        previousLogin: null,
        currentLogin: event,
      };
    }

    const distanceKm = haversineKm(
      previous.latitude,
      previous.longitude,
      event.latitude,
      event.longitude
    );

    await this.store.saveLogin(event);

    if (distanceKm < this.minDistanceKm) {
      return {
        flagged: false,
        reason: "too_close_to_matter",
        distanceKm,
        elapsedHours: null,
        impliedSpeedKmh: null,
        previousLogin: previous,
        currentLogin: event,
      };
    }

    const rawElapsedHours =
      (event.timestamp - previous.timestamp) / (1000 * 60 * 60);
    const elapsedHours = Math.max(rawElapsedHours, MIN_ELAPSED_HOURS);
    const impliedSpeedKmh = distanceKm / elapsedHours;
    const flagged = impliedSpeedKmh > this.maxPlausibleSpeedKmh;

    return {
      flagged,
      reason: flagged ? "impossible_travel" : "ok",
      distanceKm,
      elapsedHours,
      impliedSpeedKmh,
      previousLogin: previous,
      currentLogin: event,
    };
  }
}
