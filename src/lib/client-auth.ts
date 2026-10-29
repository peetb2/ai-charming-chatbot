export interface UserSessionData {
  id: string;
  email: string;
  creditBalance: number;
}

const STORAGE_KEY = "matcha_user";

export function getCachedUser(): UserSessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedUser(user: UserSessionData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("matcha_auth_change"));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearCachedUser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("matcha_auth_change"));
  } catch {
    // Ignore
  }
}

export async function fetchCurrentUser(): Promise<UserSessionData | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      if (data?.authenticated && data.user) {
        setCachedUser(data.user);
        return data.user;
      }
    }
    clearCachedUser();
    return null;
  } catch {
    return getCachedUser();
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Continue cleanup even if network fails
  } finally {
    clearCachedUser();
  }
}
