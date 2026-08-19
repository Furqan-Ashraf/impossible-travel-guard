export interface LoginEvent {
  /** Any stable identifier for the account, user id, email hash, session subject, etc. */
  userId: string;
  latitude: number;
  longitude: number;
  /** Milliseconds since epoch. Use Date.now() at the time of login. */
  timestamp: number;
  /** Optional, kept for logging/debugging only, never used in the distance math. */
  ip?: string;
  meta?: Record<string, unknown>;
}

export type CheckReason =
  | "first_login"
  | "ok"
  | "impossible_travel"
  | "too_close_to_matter";

export interface CheckResult {
  flagged: boolean;
  reason: CheckReason;
  distanceKm: number | null;
  elapsedHours: number | null;
  impliedSpeedKmh: number | null;
  previousLogin: LoginEvent | null;
  currentLogin: LoginEvent;
}

export interface LoginStore {
  getLastLogin(userId: string): Promise<LoginEvent | null> | LoginEvent | null;
  saveLogin(event: LoginEvent): Promise<void> | void;
}

export interface TravelGuardOptions {
  /**
   * Implied speed, in km/h, above which a login pair is flagged.
   * Default is 1000, comfortably above commercial flight speed (~900 km/h)
   * with headroom for measurement error in the underlying geolocation data.
   */
  maxPlausibleSpeedKmh?: number;
  /**
   * Distance below this threshold, in km, is treated as noise (GPS/IP
   * jitter within the same metro area) and never flagged, regardless of
   * elapsed time. Default is 50.
   */
  minDistanceKm?: number;
  /** Pluggable storage for each user's last known login. Defaults to an in-memory Map, replace with Redis/DB for production. */
  store?: LoginStore;
}
