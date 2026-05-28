import { readFile } from "fs/promises";
import { join } from "path";

export interface ConfigResult {
  language?: string;
  framework?: string;
  runtime?: string | { name?: string; version?: string | null };
  packageManager?: string;
}

export async function detectFromConfig(
  cwd: string
): Promise<ConfigResult | null> {
  // Priority 1: .setupr.json
  try {
    const raw = await readFile(join(cwd, ".setupr.json"), "utf-8");
    const config = JSON.parse(raw);
    if (config.language || config.framework || config.runtime || config.packageManager) {
      return {
        language: config.language,
        framework: config.framework,
        runtime: config.runtime,
        packageManager: config.packageManager,
      };
    }
  } catch {}

  // Priority 2: package.json "setupr" field
  try {
    const raw = await readFile(join(cwd, "package.json"), "utf-8");
    const pkg = JSON.parse(raw);
    if (pkg["setupr"]) {
      const ps = pkg["setupr"];
      return {
        language: ps.language,
        framework: ps.framework,
        runtime: ps.runtime,
        packageManager: ps.packageManager,
      };
    }
  } catch {}

  return null;
}
