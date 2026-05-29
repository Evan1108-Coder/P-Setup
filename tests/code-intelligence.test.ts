import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { runNonTUICommand } from "../src/commands/plain/router.js";

describe("deterministic code intelligence commands", () => {
  let tempDir: string;
  let logs: string[];

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "setupr-code-"));
    logs = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });
    process.exitCode = undefined;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("analyzes project architecture from scanner and filesystem signals", async () => {
    await createTypeScriptProject(tempDir);

    await runNonTUICommand("analyze", undefined, tempDir, { args: [] });

    expect(output()).toContain("Project analysis");
    expect(output()).toContain("Language:");
    expect(output()).toContain("Code files: 2 (1 test files)");
    expect(output()).toContain("Architecture notes:");
  });

  it("explains a file with deterministic structure signals", async () => {
    await createTypeScriptProject(tempDir);

    await runNonTUICommand("explain", "src/index.ts", tempDir, { args: [] });

    expect(output()).toContain("File summary: src/index.ts");
    expect(output()).toContain("Exports: 1");
    expect(output()).toContain("Named functions: main");
    expect(output()).toContain("TODO markers: 1");
  });

  it("suggests deterministic refactors for a file", async () => {
    await createTypeScriptProject(tempDir);

    await runNonTUICommand("refactor", "src/index.ts", tempDir, { args: [] });

    expect(output()).toContain("Refactor suggestions: src/index.ts");
    expect(output()).toContain("TODO/FIXME/HACK");
    expect(output()).toContain("console calls");
    expect(output()).toContain("broad `any` types");
  });

  it("scans and prioritizes todo markers", async () => {
    await createTypeScriptProject(tempDir);
    await writeFile(join(tempDir, "src", "extra.ts"), "// FIXME: failing path\n// HACK: temporary bridge\n");

    await runNonTUICommand("todo", undefined, tempDir, { args: [] });

    const text = output();
    expect(text).toContain("Project TODOs");
    expect(text).toContain("FIXME: failing path");
    expect(text).toContain("HACK: temporary bridge");
    expect(text).toContain("TODO: document startup");
    expect(text.indexOf("FIXME: failing path")).toBeLessThan(text.indexOf("TODO: document startup"));
  });

  it("reports missing projects as structured errors", async () => {
    await runNonTUICommand("analyze", undefined, tempDir, { args: [] });

    expect(output()).toContain("NO_PROJECT_DETECTED");
    expect(process.exitCode).toBe(1);
  });

  it("reports missing files as structured errors", async () => {
    await createTypeScriptProject(tempDir);

    await runNonTUICommand("explain", "src/missing.ts", tempDir, { args: [] });

    expect(output()).toContain("OPEN_TARGET_MISSING");
    expect(output()).toContain("src/missing.ts");
    expect(process.exitCode).toBe(1);
  });

  function output(): string {
    return logs.join("\n");
  }
});

async function createTypeScriptProject(dir: string): Promise<void> {
  await mkdir(join(dir, "src"), { recursive: true });
  await mkdir(join(dir, "tests"), { recursive: true });
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({
      name: "code-intelligence-fixture",
      version: "1.0.0",
      scripts: { test: "vitest", build: "tsc" },
      dependencies: { chalk: "^5.0.0" },
      devDependencies: { typescript: "^5.0.0", vitest: "^4.0.0" },
    })
  );
  await writeFile(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true } }));
  await writeFile(
    join(dir, "src", "index.ts"),
    [
      "import chalk from \"chalk\";",
      "",
      "export function main(value: any) {",
      "  // TODO: document startup",
      "  console.log(chalk.blue(value));",
      "}",
      "",
    ].join("\n")
  );
  await writeFile(join(dir, "tests", "index.test.ts"), "import { main } from '../src/index';\nmain('ok');\n");
}
