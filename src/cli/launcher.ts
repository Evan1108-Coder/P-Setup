import React from "react";
import { render } from "ink";
import { App, type TUICommand } from "../tui/App.js";
import { createAppStore } from "../state/store.js";
import { scanProject } from "../scanner/index.js";

interface LaunchOptions {
  cleanMode?: "deps" | "share" | "all";
}

export async function launchTUI(
  command: TUICommand,
  cwd: string,
  options?: LaunchOptions
): Promise<void> {
  const store = createAppStore(cwd);

  // Pre-scan for non-setup commands (setup does its own)
  if (command !== "setup") {
    const scan = await scanProject(cwd);
    store.getState().setScan(scan);
  }

  const { waitUntilExit } = render(
    React.createElement(App, {
      command,
      cwd,
      store,
      cleanMode: options?.cleanMode || "deps",
    }),
    { exitOnCtrlC: true }
  );

  await waitUntilExit();
}
