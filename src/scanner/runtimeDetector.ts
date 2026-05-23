import { readFile, access } from "fs/promises";
import { join } from "path";

export async function detectRuntime(
  cwd: string
): Promise<{ name: string; version: string | null } | null> {
  // Node.js version detection
  const nodeVersion = await detectNodeVersion(cwd);
  if (nodeVersion) return { name: "node", version: nodeVersion };

  // Python version
  const pyVersion = await detectPythonVersion(cwd);
  if (pyVersion) return { name: "python", version: pyVersion };

  // Ruby version
  const rubyVersion = await readVersionFile(cwd, ".ruby-version");
  if (rubyVersion) return { name: "ruby", version: rubyVersion };

  // Go version
  const goVersion = await detectGoVersion(cwd);
  if (goVersion) return { name: "go", version: goVersion };

  // Java version
  const javaVersion = await readVersionFile(cwd, ".java-version");
  if (javaVersion) return { name: "java", version: javaVersion };

  // Rust — no specific version file usually
  try {
    await access(join(cwd, "Cargo.toml"));
    return { name: "rust", version: null };
  } catch {}

  // Fallback: detect from package.json engines
  try {
    const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf-8"));
    if (pkg.engines?.node) return { name: "node", version: pkg.engines.node };
  } catch {}

  return null;
}

async function detectNodeVersion(cwd: string): Promise<string | null> {
  // .nvmrc
  const nvmrc = await readVersionFile(cwd, ".nvmrc");
  if (nvmrc) return nvmrc;

  // .node-version
  const nodeVer = await readVersionFile(cwd, ".node-version");
  if (nodeVer) return nodeVer;

  // .tool-versions (asdf/mise)
  try {
    const content = await readFile(join(cwd, ".tool-versions"), "utf-8");
    const match = content.match(/nodejs\s+(.+)/);
    if (match) return match[1].trim();
  } catch {}

  // package.json volta
  try {
    const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf-8"));
    if (pkg.volta?.node) return pkg.volta.node;
  } catch {}

  return null;
}

async function detectPythonVersion(cwd: string): Promise<string | null> {
  const pyVer = await readVersionFile(cwd, ".python-version");
  if (pyVer) return pyVer;

  try {
    const content = await readFile(join(cwd, ".tool-versions"), "utf-8");
    const match = content.match(/python\s+(.+)/);
    if (match) return match[1].trim();
  } catch {}

  try {
    const pyproject = await readFile(join(cwd, "pyproject.toml"), "utf-8");
    const match = pyproject.match(/python\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  } catch {}

  try {
    await access(join(cwd, "requirements.txt"));
    return null; // Python detected but version unknown
  } catch {}

  return null;
}

async function detectGoVersion(cwd: string): Promise<string | null> {
  try {
    const gomod = await readFile(join(cwd, "go.mod"), "utf-8");
    const match = gomod.match(/^go\s+(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  return null;
}

async function readVersionFile(cwd: string, filename: string): Promise<string | null> {
  try {
    const content = await readFile(join(cwd, filename), "utf-8");
    return content.trim() || null;
  } catch {
    return null;
  }
}
