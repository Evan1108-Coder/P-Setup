import { scanProject } from "../scanner/index.js";
import chalk from "chalk";

export async function showPreWarning(command: string, cwd: string, force: boolean): Promise<void> {
  const scan = await scanProject(cwd);

  const warnings: Record<string, string> = {
    setup: scan.language
      ? `Will scan and configure ${scan.language}${scan.framework ? ` / ${scan.framework}` : ""} project. Dependencies will be installed.`
      : "Will scan this directory and attempt to set up the project.",
    start: scan.scripts.dev
      ? `Will run: ${scan.packageManager || "npm"} run dev`
      : "Will detect and run the project's dev server.",
    doctor: "Will check your environment for issues (runtimes, deps, ports, etc).",
    update: "Will check all dependencies for available updates. No changes without confirmation.",
    clean: "Will remove build artifacts and generated files. Source code is not affected.",
  };

  const msg = warnings[command] || "Will execute the requested operation.";

  console.log("");
  console.log(chalk.yellow(`  ⚠  ${msg}`));
  console.log("");

  if (!force) {
    console.log(chalk.dim("  Press Enter to continue, Ctrl+C to cancel..."));
    await waitForEnter();
  }
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve();
      return;
    }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      const key = data.toString();
      if (key === "\x03") {
        console.log(chalk.dim("\n  Cancelled."));
        process.exit(0);
      }
      resolve();
    });
  });
}
