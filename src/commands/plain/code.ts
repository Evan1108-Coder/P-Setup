import chalk from "chalk";
import { constants } from "fs";
import { access, readFile, readdir, stat } from "fs/promises";
import { extname, isAbsolute, join, relative, resolve } from "path";
import { createSetuprError, printPlainError } from "../../errors/index.js";
import { scanProject, type ScanResult } from "../../scanner/index.js";

interface CodeFlags {
  args?: string[];
  [key: string]: unknown;
}

interface CodeFile {
  path: string;
  absolutePath: string;
  ext: string;
  lines: number;
  content: string;
}

const CODE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".mjs",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
]);

const TEXT_EXTENSIONS = new Set([
  ...CODE_EXTENSIONS,
  ".json",
  ".md",
  ".mdx",
  ".toml",
  ".txt",
  ".yaml",
  ".yml",
]);

const IGNORED_DIRS = new Set([
  ".git",
  ".setupr",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
]);

export async function cmdAnalyze(cwd: string): Promise<void> {
  const scan = await scanForCodeCommand("analyze", cwd);
  if (!scan) return;

  const files = await listProjectFiles(cwd, CODE_EXTENSIONS);
  const tests = files.filter((file) => isTestFile(file.path));
  const sourceDirs = summarizeSourceDirs(files);
  const entrypoints = files
    .filter((file) => /(^|\/)(index|main|app|server|cli|setup)\.[^.]+$/.test(file.path))
    .map((file) => file.path)
    .slice(0, 8);

  console.log(chalk.blue.bold("Project analysis"));
  console.log(`Language: ${scan.language || "unknown"}`);
  console.log(`Framework: ${scan.framework || "none detected"}`);
  console.log(`Runtime: ${scan.runtime ? [scan.runtime.name, scan.runtime.version].filter(Boolean).join(" ") : "unknown"}`);
  console.log(`Package manager: ${scan.packageManager || "unknown"}`);
  console.log(`Dependencies: ${scan.dependencies.prod} production, ${scan.dependencies.dev} development`);
  console.log(`Scripts: ${Object.keys(scan.scripts).length ? Object.keys(scan.scripts).sort().join(", ") : "none"}`);
  console.log(`Code files: ${files.length} (${tests.length} test files)`);

  if (scan.monorepo) {
    console.log(`Workspace: ${scan.monorepo.type} with ${scan.monorepo.packages.length} package(s)`);
  }
  if (sourceDirs.length) {
    console.log(`Main directories: ${sourceDirs.map(([dir, count]) => `${dir} (${count})`).join(", ")}`);
  }
  if (entrypoints.length) {
    console.log("Likely entrypoints:");
    for (const file of entrypoints) console.log(`  - ${file}`);
  }
  if (scan.configFiles.length) {
    console.log(`Config files: ${scan.configFiles.sort().join(", ")}`);
  }

  const architecture = inferArchitecture(scan, files);
  console.log("Architecture notes:");
  for (const note of architecture) console.log(`  - ${note}`);
}

export async function cmdExplain(sub: string | undefined, cwd: string, flags: CodeFlags): Promise<void> {
  if (!await scanForCodeCommand("explain", cwd)) return;

  const filePath = sub || flags.args?.[0];
  const file = await readCommandFile("explain", cwd, filePath);
  if (!file) return;

  const analysis = analyzeFile(file.content, file.path);
  console.log(chalk.blue.bold(`File summary: ${file.path}`));
  console.log(`Type: ${describeExtension(file.ext)}`);
  console.log(`Size: ${analysis.lines} lines, ${analysis.nonEmptyLines} non-empty`);
  console.log(`Imports/requires: ${analysis.imports.length}`);
  console.log(`Exports: ${analysis.exports.length}`);
  console.log(`Functions: ${analysis.functions.length}`);
  console.log(`Classes: ${analysis.classes.length}`);
  if (analysis.exports.length) console.log(`Exported API: ${analysis.exports.slice(0, 10).join(", ")}`);
  if (analysis.functions.length) console.log(`Named functions: ${analysis.functions.slice(0, 10).join(", ")}`);
  if (analysis.classes.length) console.log(`Classes: ${analysis.classes.slice(0, 10).join(", ")}`);
  if (analysis.todos.length) console.log(`TODO markers: ${analysis.todos.length}`);
  console.log(`Role: ${inferFileRole(file.path, analysis)}`);
}

export async function cmdRefactor(sub: string | undefined, cwd: string, flags: CodeFlags): Promise<void> {
  if (!await scanForCodeCommand("refactor", cwd)) return;

  const filePath = sub || flags.args?.[0];
  const file = await readCommandFile("refactor", cwd, filePath);
  if (!file) return;

  const analysis = analyzeFile(file.content, file.path);
  const suggestions = suggestRefactors(file.path, file.content, analysis);
  console.log(chalk.blue.bold(`Refactor suggestions: ${file.path}`));
  if (!suggestions.length) {
    console.log(chalk.green("No deterministic refactor suggestions found."));
    return;
  }
  for (const [index, suggestion] of suggestions.entries()) {
    console.log(`${index + 1}. ${suggestion}`);
  }
}

export async function cmdTodo(cwd: string): Promise<void> {
  const scan = await scanForCodeCommand("todo", cwd);
  if (!scan) return;

  const files = await listProjectFiles(cwd, TEXT_EXTENSIONS);
  const todos = files.flatMap((file) => findTodos(file.path, file.content || ""));
  todos.sort((a, b) => priorityRank(a.kind) - priorityRank(b.kind) || a.path.localeCompare(b.path) || a.line - b.line);

  console.log(chalk.blue.bold("Project TODOs"));
  if (!todos.length) {
    console.log(chalk.green("No TODO, FIXME, or HACK markers found."));
    return;
  }

  const counts = todos.reduce<Record<string, number>>((acc, todo) => {
    acc[todo.kind] = (acc[todo.kind] || 0) + 1;
    return acc;
  }, {});
  console.log(`Found: ${todos.length} total (${Object.entries(counts).map(([kind, count]) => `${kind}: ${count}`).join(", ")})`);
  for (const todo of todos.slice(0, 50)) {
    console.log(`[${todo.priority}] ${todo.path}:${todo.line} ${todo.kind}: ${todo.text}`);
  }
  if (todos.length > 50) console.log(chalk.dim(`...and ${todos.length - 50} more`));
}

async function scanForCodeCommand(command: string, cwd: string): Promise<ScanResult | null> {
  let scan: ScanResult;
  try {
    scan = await scanProject(cwd);
  } catch (err) {
    printPlainError(createSetuprError({
      code: "MALFORMED_PROJECT_FILE",
      command,
      cwd,
      details: [err instanceof Error ? err.message : String(err)],
    }));
    return null;
  }

  if (!hasProjectSignals(scan)) {
    printPlainError(createSetuprError({ code: "NO_PROJECT_DETECTED", command, cwd }));
    return null;
  }
  return scan;
}

function hasProjectSignals(scan: ScanResult): boolean {
  return Boolean(
    scan.language ||
    scan.framework ||
    scan.packageManager ||
    scan.runtime ||
    scan.monorepo ||
    scan.configFiles.length ||
    Object.keys(scan.scripts).length ||
    scan.dependencies.prod ||
    scan.dependencies.dev
  );
}

async function readCommandFile(command: "explain" | "refactor", cwd: string, filePath: string | undefined): Promise<CodeFile | null> {
  if (!filePath) {
    printPlainError(createSetuprError({
      code: "NON_INTERACTIVE_INPUT_REQUIRED",
      command,
      cwd,
      details: [`Usage: setupr ${command} <file>`],
    }));
    return null;
  }

  const absolutePath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  const normalized = relative(cwd, absolutePath).replace(/\\/g, "/");
  if (normalized.startsWith("..")) {
    printPlainError(createSetuprError({
      code: "OPEN_TARGET_MISSING",
      command,
      cwd,
      details: [`File must be inside the project: ${filePath}`],
    }));
    return null;
  }

  try {
    await access(absolutePath, constants.R_OK);
    const stats = await stat(absolutePath);
    if (!stats.isFile()) throw new Error("Target is not a file.");
    const content = await readFile(absolutePath, "utf-8");
    return {
      path: normalized || filePath,
      absolutePath,
      ext: extname(absolutePath).toLowerCase(),
      lines: lineCount(content),
      content,
    };
  } catch (err) {
    printPlainError(createSetuprError({
      code: "OPEN_TARGET_MISSING",
      command,
      cwd,
      details: [`File: ${filePath}`, err instanceof Error ? err.message : String(err)],
    }));
    return null;
  }
}

async function listProjectFiles(
  cwd: string,
  extensions: Set<string>
): Promise<CodeFile[]> {
  const results: CodeFile[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) await walk(join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      const absolutePath = join(dir, entry.name);
      const ext = extname(entry.name).toLowerCase();
      if (!extensions.has(ext)) continue;

      const path = relative(cwd, absolutePath).replace(/\\/g, "/");
      let content: string | undefined;
      let lines = 0;
      try {
        content = await readFile(absolutePath, "utf-8");
        lines = lineCount(content);
      } catch {
        continue;
      }
      results.push({ path, absolutePath, ext, lines, content });
    }
  }

  await walk(cwd);
  return results;
}

function analyzeFile(content: string, path: string) {
  const lines = content.split(/\r?\n/);
  const imports = lines.filter((line) => /^\s*(import\s|from\s+\S+\s+import|const\s+.+\s*=\s*require\()/.test(line));
  const exports = [
    ...content.matchAll(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g),
  ].map((match) => match[1]);
  if (/\bexport\s+default\b/.test(content) && !exports.includes("default")) exports.unshift("default");

  const functions = [
    ...content.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g),
    ...content.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g),
  ].map((match) => match[1]);
  const classes = [...content.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)].map((match) => match[1]);
  const todos = findTodos(path, content);

  return {
    lines: lineCount(content),
    nonEmptyLines: lines.filter((line) => line.trim()).length,
    imports,
    exports: [...new Set(exports)],
    functions: [...new Set(functions)],
    classes: [...new Set(classes)],
    todos,
  };
}

function suggestRefactors(path: string, content: string, analysis: ReturnType<typeof analyzeFile>): string[] {
  const suggestions: string[] = [];
  if (analysis.lines > 300) suggestions.push("Split this file into smaller modules; it is over 300 lines.");
  if (analysis.imports.length > 20) suggestions.push("Group related dependencies behind local modules; this file has more than 20 imports/requires.");
  if (analysis.functions.length > 12) suggestions.push("Move related helper functions into focused modules or service files.");
  if (analysis.todos.length) suggestions.push("Resolve or ticket TODO/FIXME/HACK markers before larger refactors.");
  if (/\bconsole\.(log|warn|error|debug)\s*\(/.test(content) && !isTestFile(path)) {
    suggestions.push("Replace direct console calls with a project logger or explicit command output boundary.");
  }
  if (/\bany\b/.test(content) && /\.(ts|tsx)$/.test(path)) {
    suggestions.push("Replace broad `any` types with specific interfaces, generics, or `unknown` plus narrowing.");
  }
  if (/if\s*\([^)]*\)\s*{[\s\S]{0,600}if\s*\([^)]*\)\s*{[\s\S]{0,600}if\s*\(/.test(content)) {
    suggestions.push("Flatten nested conditionals with early returns or extracted guard functions.");
  }
  if (/catch\s*\([^)]*\)\s*{\s*}/.test(content)) {
    suggestions.push("Avoid empty catch blocks; report, return a typed result, or add a short comment explaining why silence is safe.");
  }
  if (/(setTimeout|setInterval)\s*\(/.test(content)) {
    suggestions.push("Check timer cleanup paths so repeated command runs do not leave work behind.");
  }
  return suggestions;
}

function findTodos(path: string, content: string): Array<{ path: string; line: number; kind: string; text: string; priority: string }> {
  const todos: Array<{ path: string; line: number; kind: string; text: string; priority: string }> = [];
  content.split(/\r?\n/).forEach((line, index) => {
    const match = line.match(/\b(TODO|FIXME|HACK)\b:?\s*(.*)/i);
    if (!match) return;
    const kind = match[1].toUpperCase();
    todos.push({
      path,
      line: index + 1,
      kind,
      text: match[2].trim() || "(no detail)",
      priority: kind === "FIXME" || kind === "HACK" ? "high" : "normal",
    });
  });
  return todos;
}

function inferArchitecture(scan: ScanResult, files: CodeFile[]): string[] {
  const notes: string[] = [];
  if (scan.monorepo) notes.push("Workspace-oriented project; inspect package boundaries before cross-package edits.");
  if (scan.framework) notes.push(`${scan.framework} appears to drive the application structure.`);
  if (files.some((file) => file.path.startsWith("src/"))) notes.push("Primary source appears to live under src/.");
  if (files.some((file) => /(^|\/)(pages|app|routes)\//.test(file.path))) notes.push("Route or page-based structure detected.");
  if (files.some((file) => /(^|\/)(components|ui)\//.test(file.path))) notes.push("UI components are grouped separately from app/runtime code.");
  if (files.some((file) => isTestFile(file.path))) notes.push("Tests are present; keep refactors covered by existing test patterns.");
  if (!notes.length) notes.push("No strong architecture pattern detected from filenames alone.");
  return notes;
}

function inferFileRole(path: string, analysis: ReturnType<typeof analyzeFile>): string {
  if (isTestFile(path)) return "test/spec coverage";
  if (/(^|\/)(components|ui)\//.test(path)) return "UI component module";
  if (/(^|\/)(routes|pages|app)\//.test(path)) return "route/page module";
  if (/(^|\/)(cli|commands)\//.test(path)) return "command or CLI module";
  if (analysis.classes.length) return "class-oriented module";
  if (analysis.exports.length > 1) return "library/helper module";
  if (analysis.functions.length > 0) return "function module";
  return "support/configuration file";
}

function summarizeSourceDirs(files: CodeFile[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const file of files) {
    const parts = file.path.split("/");
    const key = parts.length > 1 ? parts.slice(0, Math.min(2, parts.length - 1)).join("/") : ".";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);
}

function describeExtension(ext: string): string {
  const names: Record<string, string> = {
    ".js": "JavaScript",
    ".jsx": "React JavaScript",
    ".ts": "TypeScript",
    ".tsx": "React TypeScript",
    ".py": "Python",
    ".go": "Go",
    ".rs": "Rust",
    ".json": "JSON",
    ".md": "Markdown",
  };
  return names[ext] || (ext ? ext.slice(1).toUpperCase() : "unknown");
}

function isTestFile(path: string): boolean {
  return /(^|\/)(__tests__|tests?)\//.test(path) || /\.(test|spec)\.[^.]+$/.test(path);
}

function priorityRank(kind: string): number {
  if (kind === "FIXME") return 0;
  if (kind === "HACK") return 1;
  return 2;
}

function lineCount(content: string): number {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}
