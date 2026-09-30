export interface BotItem {
  id: string;
  name: string;
  desc: string;
  model: string;
  lastActive: string;
  status: "active" | "paused";
  knowledgeCount?: number;
  usageCount?: number;
  systemPrompt?: string;
}

export const INITIAL_BOTS: BotItem[] = [];

const STORAGE_KEY = "chaming_bots_data";

export function getStoredBots(): BotItem[] {
  if (typeof window === "undefined") {
    return INITIAL_BOTS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return INITIAL_BOTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error("Failed to load bots from localStorage:", err);
  }
  return INITIAL_BOTS;
}

export function saveStoredBots(bots: BotItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bots));
  } catch (err) {
    console.error("Failed to save bots to localStorage:", err);
  }
}

export function addStoredBot(bot: BotItem): BotItem[] {
  const current = getStoredBots();
  const updated = [bot, ...current];
  saveStoredBots(updated);
  return updated;
}
