import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { describeDefaultModelSelection } from "../ai/models.js";
import { sanitizeForAI } from "../ai/directorContext.js";
import type {
  AgentPrompt,
  AppHydrationState,
  AppMessage,
  AppStore,
  EnvVar,
  LogEntry,
  NoticeInfo,
} from "./store.js";
import { projectStateDir, readProjectJson, writeProjectJson, type JsonValue } from "./project.js";
import type { SetupStep } from "../ai/planner.js";

export const CHAT_SESSION_DIR = "chat";
export const CHAT_SESSION_FILE = "chat/session.json";

export type ChatSessionStatus =
  | "idle"
  | "thinking"
  | "running"
  | "awaiting-choice"
  | "awaiting-text"
  | "awaiting-secret"
  | "paused"
  | "failed";

export interface ChatSessionSnapshot {
  version: 1;
  id: string;
  cwd: string;
  title: string;
  status: ChatSessionStatus;
  createdAt: number;
  updatedAt: number;
  lastAction?: string;
  model?: string;
  messages: AppMessage[];
  logs: LogEntry[];
  steps: SetupStep[];
  currentStepIndex: number;
  isRunning: boolean;
  isComplete: boolean;
  pendingPrompt: AgentPrompt | null;
  notices: NoticeInfo[];
  envVars: EnvVar[];
  ports: AppHydrationState["ports"];
  keyDeps: AppHydrationState["keyDeps"];
  services: AppHydrationState["services"];
  packageStats: {
    totalPackages: number;
    installedPackages: number;
    deprecatedCount: number;
    vulnerabilities: { high: number; moderate: number; low: number };
    lockSynced: boolean;
  };
}

export interface SaveChatSessionOptions {
  status?: ChatSessionStatus;
  lastAction?: string;
  title?: string;
}

export async function loadChatSession(cwd: string): Promise<ChatSessionSnapshot | null> {
  const snapshot = await readProjectJson<ChatSessionSnapshot | null>(cwd, CHAT_SESSION_FILE, null);
  if (!snapshot || snapshot.version !== 1 || snapshot.cwd !== cwd) return null;
  return snapshot;
}

export async function saveChatSession(
  cwd: string,
  store: AppStore,
  options: SaveChatSessionOptions = {}
): Promise<ChatSessionSnapshot> {
  await mkdir(join(projectStateDir(cwd), CHAT_SESSION_DIR), { recursive: true });
  const state = store.getState();
  const now = Date.now();
  const previous = await loadChatSession(cwd).catch(() => null);
  const snapshot: ChatSessionSnapshot = {
    version: 1,
    id: previous?.id || `chat-${now.toString(36)}`,
    cwd,
    title: sanitizeForAI(options.title || previous?.title || state.projectName || "Setupr chat"),
    status: options.status || statusFromStore(state.isRunning, state.pendingPrompt) || previous?.status || "idle",
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    lastAction: sanitizeForAI(options.lastAction || previous?.lastAction || ""),
    model: describeDefaultModelSelection(),
    messages: state.messages.map(sanitizeMessage).slice(-500),
    logs: state.logs.map(sanitizeLog).slice(-500),
    steps: state.steps.map(sanitizeStep).slice(-100),
    currentStepIndex: state.currentStepIndex,
    isRunning: state.isRunning,
    isComplete: state.isComplete,
    pendingPrompt: sanitizePrompt(state.pendingPrompt),
    notices: state.notices.map((notice) => ({ ...notice, message: sanitizeForAI(notice.message) })).slice(-100),
    envVars: state.envVars.map(sanitizeEnvVar),
    ports: state.ports,
    keyDeps: state.keyDeps,
    services: state.services,
    packageStats: {
      totalPackages: state.totalPackages,
      installedPackages: state.installedPackages,
      deprecatedCount: state.deprecatedCount,
      vulnerabilities: state.vulnerabilities,
      lockSynced: state.lockSynced,
    },
  };
  await writeProjectJson(cwd, CHAT_SESSION_FILE, snapshot as unknown as JsonValue);
  return snapshot;
}

export async function hydrateChatSession(cwd: string, store: AppStore): Promise<ChatSessionSnapshot | null> {
  const snapshot = await loadChatSession(cwd);
  if (!snapshot) return null;
  store.getState().hydrateSession(snapshotToHydration(snapshot));
  return snapshot;
}

export async function deleteChatSession(cwd: string): Promise<void> {
  await rm(join(projectStateDir(cwd), CHAT_SESSION_DIR), { recursive: true, force: true });
}

export function snapshotToHydration(snapshot: ChatSessionSnapshot): AppHydrationState {
  return {
    messages: snapshot.messages,
    logs: snapshot.logs,
    steps: snapshot.steps,
    currentStepIndex: snapshot.currentStepIndex,
    isRunning: snapshot.isRunning,
    isComplete: snapshot.isComplete,
    pendingPrompt: snapshot.pendingPrompt,
    notices: snapshot.notices,
    envVars: snapshot.envVars,
    ports: snapshot.ports,
    keyDeps: snapshot.keyDeps,
    services: snapshot.services,
    totalPackages: snapshot.packageStats.totalPackages,
    installedPackages: snapshot.packageStats.installedPackages,
    deprecatedCount: snapshot.packageStats.deprecatedCount,
    vulnerabilities: snapshot.packageStats.vulnerabilities,
    lockSynced: snapshot.packageStats.lockSynced,
  };
}

function statusFromStore(isRunning: boolean, prompt: AgentPrompt | null): ChatSessionStatus | null {
  if (prompt?.type === "choice" || prompt?.type === "confirm") return "awaiting-choice";
  if (prompt?.type === "secret") return "awaiting-secret";
  if (prompt?.type === "input") return "awaiting-text";
  if (isRunning) return "running";
  return null;
}

function sanitizeMessage(message: AppMessage): AppMessage {
  return {
    ...message,
    content: sanitizeForAI(message.content),
  };
}

function sanitizeLog(log: LogEntry): LogEntry {
  return {
    ...log,
    content: sanitizeForAI(log.content),
  };
}

function sanitizeStep(step: SetupStep): SetupStep {
  return {
    ...step,
    command: step.command ? sanitizeForAI(step.command) : step.command,
    output: step.output ? sanitizeForAI(step.output) : step.output,
    error: step.error ? sanitizeForAI(step.error) : step.error,
  };
}

function sanitizePrompt(prompt: AgentPrompt | null): AgentPrompt | null {
  if (!prompt) return null;
  return {
    ...prompt,
    message: prompt.message ? sanitizeForAI(prompt.message) : prompt.message,
    options: prompt.options?.map((option) => ({
      ...option,
      label: option.sensitive ? mask(option.label) : sanitizeForAI(option.label),
      description: option.description ? sanitizeForAI(option.description) : option.description,
    })),
  };
}

function sanitizeEnvVar(envVar: EnvVar): EnvVar {
  return {
    ...envVar,
    value: shouldMaskKey(envVar.key) ? mask(envVar.value) : sanitizeForAI(envVar.value),
  };
}

function shouldMaskKey(key: string): boolean {
  return /(TOKEN|SECRET|PASSWORD|PASS|API_?KEY|PRIVATE|CREDENTIAL|AUTH|BEARER|SESSION|COOKIE)/i.test(key);
}

function mask(value: string): string {
  if (!value) return "";
  return "****";
}
