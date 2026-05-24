import React, { useEffect, useState, useCallback } from "react";
import { Box, Text, useApp } from "ink";
import { HeaderBar } from "../components/HeaderBar.js";
import { InfoPanels } from "../components/InfoPanels.js";
import { Sidebar } from "../components/Sidebar.js";
import { ExecutionLog } from "../components/ExecutionLog.js";
import { EnvInput } from "../components/EnvInput.js";
import { FooterBar } from "../components/FooterBar.js";
import { SystemInfo } from "../components/SystemInfo.js";
import { Summary } from "../components/Summary.js";
import { ChatInput } from "../components/ChatInput.js";
import { useNavigation } from "../hooks/useNavigation.js";
import { useAppStore } from "../hooks/useStore.js";
import { colors } from "../theme.js";
import type { AppStore } from "../../state/store.js";
import { intelligentResponse } from "../../ai/intelligence.js";
import { contextToDSL } from "../../ai/dsl.js";

interface SetupLayoutProps {
  store: AppStore;
}

export function SetupLayout({ store }: SetupLayoutProps) {
  const { exit } = useApp();
  const { activePanel } = useNavigation({ panelCount: 4, onQuit: () => exit() });

  const steps = useAppStore(store, (s) => s.steps);
  const scan = useAppStore(store, (s) => s.scan);
  const isComplete = useAppStore(store, (s) => s.isComplete);
  const currentStepIndex = useAppStore(store, (s) => s.currentStepIndex);
  const logs = useAppStore(store, (s) => s.logs);
  const envVars = useAppStore(store, (s) => s.envVars);
  const envPromptKey = useAppStore(store, (s) => s.envPromptKey);
  const ports = useAppStore(store, (s) => s.ports);
  const keyDeps = useAppStore(store, (s) => s.keyDeps);
  const services = useAppStore(store, (s) => s.services);
  const notices = useAppStore(store, (s) => s.notices);
  const checkpointSaved = useAppStore(store, (s) => s.checkpointSaved);
  const totalPackages = useAppStore(store, (s) => s.totalPackages);
  const installedPackages = useAppStore(store, (s) => s.installedPackages);
  const deprecatedCount = useAppStore(store, (s) => s.deprecatedCount);
  const vulnerabilities = useAppStore(store, (s) => s.vulnerabilities);
  const lockSynced = useAppStore(store, (s) => s.lockSynced);
  const projectName = useAppStore(store, (s) => s.projectName);
  const messages = useAppStore(store, (s) => s.messages);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = store.getState().startTime;
    const timer = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);
    return () => clearInterval(timer);
  }, [store]);

  const handleChat = useCallback(async (text: string) => {
    store.getState().addMessage({ role: "user", content: text });
    const state = store.getState();
    if (state.scan && state.context) {
      const dsl = contextToDSL(state.context);
      const result = await intelligentResponse(text, state.scan, dsl);
      store.getState().addMessage({
        role: "assistant",
        content: result.response,
        level: result.level,
        cost: result.cost,
      });
    }
  }, [store]);

  const handleEnvSubmit = useCallback((value: string) => {
    const key = store.getState().envPromptKey;
    if (!key) return;
    const vars = store.getState().envVars.map((v) =>
      v.key === key ? { ...v, value, status: "filled" as const } : v
    );
    store.getState().setEnvVars(vars);
    store.getState().addLog({ content: `✓ ${key} = ${value.slice(0, 3)}${"*".repeat(Math.max(0, value.length - 3))} (manual)`, type: "success" });
    advanceEnvPrompt(store);
  }, [store]);

  const handleEnvSkip = useCallback(() => {
    const key = store.getState().envPromptKey;
    if (!key) return;
    const vars = store.getState().envVars.map((v) =>
      v.key === key ? { ...v, status: "skipped" as const } : v
    );
    store.getState().setEnvVars(vars);
    store.getState().addLog({ content: `○ ${key} — skipped`, type: "info" });
    advanceEnvPrompt(store);
  }, [store]);

  if (isComplete && scan) {
    return (
      <Box flexDirection="column" width="100%">
        <Summary scan={scan} steps={steps} duration={elapsed} />
        <ChatInput active={activePanel === 0} onSubmit={handleChat} placeholder="Ask about your project..." />
      </Box>
    );
  }

  const currentStep = steps[currentStepIndex];
  const stack = buildStackString(scan);
  const stepLabel = currentStep?.label || "Scanning";
  const autoFilled = envVars.filter((v) => v.status === "auto").length;
  const needInput = envVars.filter((v) => v.status === "pending").length;
  const envSource = envVars.length > 0 ? ".env.example" : "";
  const remainingEnv = envVars.filter((v) => v.status === "pending").length;

  const currentStepLog = currentStep
    ? `Step ${currentStepIndex + 1} — ${currentStep.label} ${currentStep.status === "done" ? "✓ complete" : "in progress"}`
    : "Scanning project structure...";

  return (
    <Box flexDirection="column" width="100%">
      {/* Top header bar */}
      <HeaderBar
        projectName={projectName}
        stack={stack}
        currentStep={stepLabel}
        stepNum={currentStepIndex + 1}
        totalSteps={steps.length || 7}
        elapsed={elapsed}
        checkpointSaved={checkpointSaved}
      />

      {/* Multi-column info panels + Sidebar */}
      <Box flexDirection="row" width="100%">
        <Box flexDirection="column" width="78%">
          {/* Info panel row */}
          <InfoPanels
            steps={steps}
            currentStepIndex={currentStepIndex}
            scan={scan}
            totalPackages={totalPackages}
            installedPackages={installedPackages}
            deprecatedCount={deprecatedCount}
            vulnerabilities={vulnerabilities}
            lockSynced={lockSynced}
            envVars={envVars}
            services={services}
          />

          {/* Execution log area */}
          <Box flexDirection="row" marginTop={0}>
            <Box flexDirection="column" width="100%" paddingX={1}>
              <ExecutionLog
                logs={logs}
                maxLines={14}
                currentStepTitle={currentStepLog}
                stepStatus={currentStep?.status === "done" ? "complete" : "in progress"}
              />
            </Box>
          </Box>
        </Box>

        {/* Right sidebar */}
        <Sidebar
          stepNum={currentStepIndex + 1}
          totalSteps={steps.length || 7}
          currentStepLabel={stepLabel}
          envSource={envSource}
          totalVars={envVars.length}
          filledVars={autoFilled}
          needInput={needInput}
          elapsed={elapsed}
          ports={ports}
          keyDeps={keyDeps}
          notices={notices}
        />
      </Box>

      {/* Bottom section: system info + env input or chat */}
      <Box flexDirection="row" width="100%">
        <SystemInfo />
        <Box flexDirection="column" width="88%">
          {envPromptKey ? (
            <EnvInput
              varKey={envPromptKey}
              remainingCount={remainingEnv - 1}
              onSubmit={handleEnvSubmit}
              onSkip={handleEnvSkip}
            />
          ) : (
            <ChatInput active={activePanel === 3} onSubmit={handleChat} placeholder="Ask anything or paste a value..." />
          )}
        </Box>
      </Box>

      {/* Footer */}
      <FooterBar version="v0.1.0" checkpointPath={store.getState().checkpointPath} />
    </Box>
  );
}

function buildStackString(scan: { language?: string | null; framework?: string | null; services?: string[] } | null): string {
  if (!scan) return "Detecting...";
  const parts: string[] = [];
  if (scan.framework) parts.push(scan.framework);
  if (scan.language) parts.push(scan.language);
  if (scan.services && scan.services.length > 0) {
    parts.push(...scan.services.slice(0, 3));
  }
  return parts.join(" + ") || "Unknown";
}

function advanceEnvPrompt(store: AppStore) {
  const vars = store.getState().envVars;
  const nextPending = vars.find((v) => v.status === "pending");
  store.getState().setEnvPrompt(nextPending?.key || null);
}
