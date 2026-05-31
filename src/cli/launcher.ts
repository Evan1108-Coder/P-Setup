import React from "react";
import { render } from "ink";
import { App, type TUICommand } from "../tui/App.js";
import { createAppStore } from "../state/store.js";
import { scanProject } from "../scanner/index.js";
import { collectDashboardStatus, createDashboardFallbackStatus, type DashboardStatus } from "../status/collector.js";

interface LaunchOptions {
  cleanMode?: "deps" | "share" | "all";
  force?: boolean;
  chatInitialMessage?: string;
  chatStartNew?: boolean;
  chatResume?: boolean;
}

export async function launchTUI(
  command: TUICommand,
  cwd: string,
  options?: LaunchOptions
): Promise<void> {
  process.stdout.write("\x1B[0m");

  const store = createAppStore(cwd);
  let dashboardStatus: DashboardStatus | undefined;

  if (command !== "setup" && command !== "dashboard" && command !== "status") {
    const scan = await scanProject(cwd);
    store.getState().setScan(scan);
  } else if (command === "dashboard" || command === "status") {
    dashboardStatus = await collectDashboardStatusForTui(cwd);
  }

  const restoreStdout = stripScrollbackClear();

  const { waitUntilExit } = render(
    React.createElement(App, {
      command,
      cwd,
      store,
      cleanMode: options?.cleanMode || "deps",
      force: options?.force || false,
      dashboardStatus,
      chatInitialMessage: options?.chatInitialMessage,
      chatStartNew: options?.chatStartNew,
      chatResume: options?.chatResume,
    }),
    { exitOnCtrlC: true }
  );

  try {
    await waitUntilExit();
  } finally {
    restoreStdout();
  }
}

async function collectDashboardStatusForTui(cwd: string): Promise<DashboardStatus> {
  const timeout = new Promise<DashboardStatus>((resolve) => {
    setTimeout(() => resolve(createDashboardFallbackStatus(cwd, "Status probes timed out before TUI render.")), 2500);
  });
  return Promise.race([collectDashboardStatus(cwd), timeout]);
}

function stripScrollbackClear(): () => void {
  const originalWrite = process.stdout.write;
  const escape = String.fromCharCode(27);
  const scrollbackClear = `${escape}[3J`;

  process.stdout.write = function writeWithoutScrollbackClear(
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ): boolean {
    const cleanChunk = typeof chunk === "string"
      ? chunk.split(scrollbackClear).join("")
      : Buffer.isBuffer(chunk)
        ? Buffer.from(chunk.toString("utf8").split(scrollbackClear).join(""))
        : chunk;

    return originalWrite.call(process.stdout, cleanChunk, encodingOrCallback as BufferEncoding, callback);
  } as typeof process.stdout.write;

  return () => {
    process.stdout.write = originalWrite;
  };
}
