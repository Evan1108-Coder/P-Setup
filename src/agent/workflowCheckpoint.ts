import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import type { SetupStep } from "../ai/planner.js";
import type { PlanDiff } from "./planDiff.js";

const DIR = ".setupr";
const FILE = "agent-workflow.json";

export interface AgentWorkflowCheckpoint {
  version: 1;
  timestamp: number;
  cwd: string;
  command: "setup" | "start" | "doctor";
  phase: "context" | "planning" | "prompt" | "executing" | "diagnosing" | "complete";
  activeStepId?: string;
  steps: SetupStep[];
  completedStepIds: string[];
  failedStepIds: string[];
  skippedStepIds: string[];
  pendingPrompt?: {
    id: string;
    title: string;
    sensitive?: boolean;
  };
  userAnswers: Array<{ promptId: string; value: string; timestamp: number }>;
  lastDecision?: string;
  lastPlanDiff?: PlanDiff;
  safeOutputs: Array<{ stepId: string; exitCode?: number; excerpt: string; timestamp: number }>;
}

export async function saveAgentWorkflowCheckpoint(
  cwd: string,
  data: Omit<AgentWorkflowCheckpoint, "version" | "timestamp">
): Promise<void> {
  await mkdir(join(cwd, DIR), { recursive: true });
  const checkpoint: AgentWorkflowCheckpoint = { version: 1, timestamp: Date.now(), ...data };
  await writeFile(join(cwd, DIR, FILE), `${JSON.stringify(checkpoint, null, 2)}\n`, "utf-8");
}

export async function loadAgentWorkflowCheckpoint(cwd: string): Promise<AgentWorkflowCheckpoint | null> {
  try {
    const parsed = JSON.parse(await readFile(join(cwd, DIR, FILE), "utf-8")) as AgentWorkflowCheckpoint;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export async function deleteAgentWorkflowCheckpoint(cwd: string): Promise<void> {
  await rm(join(cwd, DIR, FILE), { force: true }).catch(() => undefined);
}
