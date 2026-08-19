/**
 * Optional helper: resolve an IP to lat/lng using IPGeolocation.io, then
 * hand the result to TravelGuard. This library does not depend on any
 * specific geolocation provider, plug in whichever one you already use,
 * this is just a working example since it is a common pairing.
 *
 * Free tier covers the location lookup used here. See
 * https://ipgeolocation.io/ip-location-api.html for details and rate limits.
 */
import { LoginEvent } from "../src/types";

const API_KEY = process.env.IPGEO_API_KEY;

interface IpGeoResponse {
  location?: {
    latitude?: string;
    longitude?: string;
  };
}

export async function loginEventFromIp(
  userId: string,
  ip: string
): Promise<LoginEvent> {
  if (!API_KEY) {
    throw new Error("Set IPGEO_API_KEY in the environment before calling this.");
  }

  const url = `https://api.ipgeolocation.io/v3/ipgeo?apiKey=${API_KEY}&ip=${encodeURIComponent(
    ip
  )}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`IP lookup failed with status ${res.status}`);
  }

  const data = (await res.json()) as IpGeoResponse;
  const lat = data.location?.latitude;
  const lon = data.location?.longitude;

  if (!lat || !lon) {
    throw new Error(`No location data returned for IP ${ip}`);
  }

  return {
    userId,
    ip,
    latitude: parseFloat(lat),
    longitude: parseFloat(lon),
    timestamp: Date.now(),
  };
}
