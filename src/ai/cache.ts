import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";

const CACHE_DIR = join(process.env.HOME || "~", ".p-setup", "cache");

interface CacheEntry {
  response: string;
  timestamp: number;
  tokens: number;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export async function getCached(key: string): Promise<CacheEntry | null> {
  try {
    const file = join(CACHE_DIR, `${hashKey(key)}.json`);
    const raw = await readFile(file, "utf-8");
    const entry: CacheEntry = JSON.parse(raw);

    // Expire after 24 hours
    if (Date.now() - entry.timestamp > 86_400_000) return null;

    return entry;
  } catch {
    return null;
  }
}

export async function setCache(key: string, response: string, tokens: number): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const file = join(CACHE_DIR, `${hashKey(key)}.json`);
    const entry: CacheEntry = { response, timestamp: Date.now(), tokens };
    await writeFile(file, JSON.stringify(entry));
  } catch {}
}

export function buildCacheKey(query: string, contextDSL: string): string {
  return `${query}::${contextDSL}`;
}
