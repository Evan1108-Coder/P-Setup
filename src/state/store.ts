import { createStore } from "zustand/vanilla";
import type { ScanResult } from "../scanner/index.js";
import type { SetupStep } from "../ai/planner.js";
import type { ProjectContext } from "../ai/dsl.js";

export interface AppMessage {
  id: string;
  role: "system" | "user" | "assistant" | "thinking";
  content: string;
  timestamp: number;
  level?: "pattern" | "cached" | "live";
  cost?: number;
}

export interface AppState {
  // Navigation
  activePanel: number;
  panelCount: number;

  // Project
  cwd: string;
  scan: ScanResult | null;
  context: ProjectContext | null;

  // Setup flow
  steps: SetupStep[];
  currentStepIndex: number;
  isRunning: boolean;
  isComplete: boolean;

  // Chat
  messages: AppMessage[];
  inputValue: string;

  // Actions
  setScan: (scan: ScanResult) => void;
  setContext: (ctx: ProjectContext) => void;
  setSteps: (steps: SetupStep[]) => void;
  updateStep: (id: string, update: Partial<SetupStep>) => void;
  nextStep: () => void;
  addMessage: (msg: Omit<AppMessage, "id" | "timestamp">) => void;
  setInput: (value: string) => void;
  setActivePanel: (index: number) => void;
  setRunning: (running: boolean) => void;
  setComplete: (complete: boolean) => void;
}

export function createAppStore(cwd: string) {
  return createStore<AppState>((set, get) => ({
    activePanel: 0,
    panelCount: 4,
    cwd,
    scan: null,
    context: null,
    steps: [],
    currentStepIndex: 0,
    isRunning: false,
    isComplete: false,
    messages: [],
    inputValue: "",

    setScan: (scan) => set({ scan }),
    setContext: (context) => set({ context }),
    setSteps: (steps) => set({ steps }),

    updateStep: (id, update) =>
      set((state) => ({
        steps: state.steps.map((s) => (s.id === id ? { ...s, ...update } : s)),
      })),

    nextStep: () =>
      set((state) => ({
        currentStepIndex: Math.min(state.currentStepIndex + 1, state.steps.length - 1),
      })),

    addMessage: (msg) =>
      set((state) => ({
        messages: [
          ...state.messages,
          { ...msg, id: crypto.randomUUID().slice(0, 8), timestamp: Date.now() },
        ],
      })),

    setInput: (inputValue) => set({ inputValue }),
    setActivePanel: (activePanel) => set({ activePanel }),
    setRunning: (isRunning) => set({ isRunning }),
    setComplete: (isComplete) => set({ isComplete }),
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;
