import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { spawnSync } from "child_process";
import { runNonTUICommand } from "../src/commands/plain/router.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "setupr-git-intel-"));
  spawnSync("git", ["init", "-b", "main"], { cwd: tempDir });
  spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
  spawnSync("git", ["config", "user.name", "Tester"], { cwd: tempDir });
  await writeFile(join(tempDir, "README.md"), "# Test\n");
  spawnSync("git", ["add", "."], { cwd: tempDir });
  spawnSync("git", ["commit", "-m", "docs: initial"], { cwd: tempDir });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
  process.exitCode = undefined;
});

describe("git intelligence helpers", () => {
  it("suggests a commit message from changed files", async () => {
    await writeFile(join(tempDir, "src.ts"), "export const value = 1;\n");

    const outputs = await captureConsole(async () => {
      await runNonTUICommand("git", "commit-message", tempDir, { args: [] });
    });

    expect(outputs.join("\n")).toContain("Suggested Commit Message");
    expect(outputs.join("\n")).toContain("feat");
  });

  it("drafts a PR description from branch changes", async () => {
    spawnSync("git", ["checkout", "-b", "feature/demo"], { cwd: tempDir });
    await writeFile(join(tempDir, "feature.txt"), "hello\n");
    spawnSync("git", ["add", "."], { cwd: tempDir });
    spawnSync("git", ["commit", "-m", "feat: add demo"], { cwd: tempDir });

    const outputs = await captureConsole(async () => {
      await runNonTUICommand("git", "pr-description", tempDir, { args: [] });
    });

    const text = outputs.join("\n");
    expect(text).toContain("PR Description Draft");
    expect(text).toContain("feat: add demo");
  });

  it("warns when working on main", async () => {
    const outputs = await captureConsole(async () => {
      await runNonTUICommand("git", "branch-check", tempDir, { args: [] });
    });

    expect(outputs.join("\n")).toContain("main branch");
  });

  it("reports conflict marker lines", async () => {
    await writeFile(join(tempDir, "conflict.txt"), "<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> branch\n");

    const outputs = await captureConsole(async () => {
      await runNonTUICommand("git", "conflicts", tempDir, { args: [] });
    });

    expect(outputs.join("\n")).toContain("Conflict markers");
    expect(outputs.join("\n")).toContain("conflict.txt");
  });
});

async function captureConsole(fn: () => Promise<void>): Promise<string[]> {
  const log = console.log;
  const outputs: string[] = [];
  console.log = (...args: unknown[]) => outputs.push(args.join(" "));
  try {
    await fn();
    return outputs;
  } finally {
    console.log = log;
  }
}
