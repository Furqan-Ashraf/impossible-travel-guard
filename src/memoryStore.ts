import { LoginEvent, LoginStore } from "./types";

/**
 * Default in-memory store. Fine for a single-process demo or a small app,
 * loses all history on restart and does not work across multiple server
 * instances. Swap in a Redis or database-backed LoginStore for production,
 * the interface is two methods, see README for an example.
 */
export class MemoryStore implements LoginStore {
  private lastLogins = new Map<string, LoginEvent>();

  getLastLogin(userId: string): LoginEvent | null {
    return this.lastLogins.get(userId) ?? null;
  }

  saveLogin(event: LoginEvent): void {
    this.lastLogins.set(event.userId, event);
  }
}
