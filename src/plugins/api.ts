import type { SetupStep } from "../ai/planner.js";
import type { ProjectContext } from "../ai/dsl.js";
import type { ScanResult } from "../scanner/index.js";

export interface SetuprPluginContext {
  cwd: string;
  scan: ScanResult;
  projectContext?: ProjectContext;
  log: (message: string) => void;
}

export interface SetuprPluginCommand {
  name: string;
  summary: string;
  run: (context: SetuprPluginContext, args: string[]) => Promise<void> | void;
}

export interface SetuprPluginScanner {
  name: string;
  scan: (context: SetuprPluginContext) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

export interface SetuprPluginPlanner {
  name: string;
  plan: (context: SetuprPluginContext, steps: SetupStep[]) => Promise<SetupStep[]> | SetupStep[];
}

export interface SetuprPluginDoctorCheck {
  name: string;
  check: (context: SetuprPluginContext) => Promise<{
    status: "pass" | "warn" | "fail";
    message: string;
    fix?: { label: string; command?: string };
  }>;
}

export interface SetuprPluginFixer {
  name: string;
  canFix: (issueCode: string, context: SetuprPluginContext) => boolean;
  fix: (issueCode: string, context: SetuprPluginContext) => Promise<void>;
}

export interface SetuprPluginPanel {
  id: string;
  title: string;
  renderText: (context: SetuprPluginContext) => Promise<string> | string;
}

export interface SetuprPlugin {
  name: string;
  apiVersion: "1";
  commands?: SetuprPluginCommand[];
  scanners?: SetuprPluginScanner[];
  planners?: SetuprPluginPlanner[];
  doctorChecks?: SetuprPluginDoctorCheck[];
  fixers?: SetuprPluginFixer[];
  panels?: SetuprPluginPanel[];
}
