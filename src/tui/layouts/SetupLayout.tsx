import React, { useEffect, useCallback } from "react";
import { Box, Text, useApp } from "ink";
import { Panel } from "../components/Panel.js";
import { StepList } from "../components/StepList.js";
import { LogStream } from "../components/LogStream.js";
import { ChatInput } from "../components/ChatInput.js";
import { StatusBar } from "../components/StatusBar.js";
import { Summary } from "../components/Summary.js";
import { Spinner } from "../components/Spinner.js";
import { useNavigation } from "../hooks/useNavigation.js";
import { useMessages, useSteps, useScan, useIsRunning, useIsComplete } from "../hooks/useStore.js";
import { colors, icons } from "../theme.js";
import type { AppStore } from "../../state/store.js";
import { intelligentResponse } from "../../ai/intelligence.js";
import { contextToDSL } from "../../ai/dsl.js";

interface SetupLayoutProps {
  store: AppStore;
}

export function SetupLayout({ store }: SetupLayoutProps) {
  const { exit } = useApp();
  const { activePanel } = useNavigation({ panelCount: 4, onQuit: () => exit() });

  const messages = useMessages(store);
  const steps = useSteps(store);
  const scan = useScan(store);
  const isRunning = useIsRunning(store);
  const isComplete = useIsComplete(store);
  const currentStepIndex = store.getState().currentStepIndex;

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

  // Show summary if complete
  if (isComplete && scan) {
    return (
      <Box flexDirection="column" width="100%">
        <Summary scan={scan} steps={steps} duration={Date.now() - (messages[0]?.timestamp || Date.now())} />
        <ChatInput active={activePanel === 0} onSubmit={handleChat} placeholder="Ask about your project..." />
      </Box>
    );
  }

  const doneCount = steps.filter((s) => s.status === "done").length;
  const stepProgress = steps.length > 0 ? `${doneCount}/${steps.length} steps` : "scanning...";

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={0}>
        <Text color={colors.primary} bold> P-Setup</Text>
        <Text color={colors.textDim}>{scan?.language || "..."} {scan?.framework ? `/ ${scan.framework}` : ""}</Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left: AI Panel */}
        <Panel title="AI Agent" active={activePanel === 0} width="60%">
          <LogStream messages={messages} maxLines={12} />
        </Panel>

        {/* Right: Status + Info */}
        <Box flexDirection="column" width="40%">
          <Panel title="Progress" active={activePanel === 1} height={steps.length + 4}>
            {steps.length > 0 ? (
              <StepList steps={steps} currentIndex={currentStepIndex} />
            ) : (
              <Spinner label="Scanning project..." />
            )}
          </Panel>

          <Panel title="Project" active={activePanel === 2}>
            {scan ? (
              <Box flexDirection="column">
                <Text color={colors.text}>{icons.dot} Language: <Text color={colors.info}>{scan.language || "unknown"}</Text></Text>
                <Text color={colors.text}>{icons.dot} Framework: <Text color={colors.info}>{scan.framework || "none"}</Text></Text>
                <Text color={colors.text}>{icons.dot} PM: <Text color={colors.info}>{scan.packageManager || "none"}</Text></Text>
                <Text color={colors.text}>{icons.dot} Runtime: <Text color={colors.info}>{scan.runtime?.name || "none"}{scan.runtime?.version ? ` ${scan.runtime.version}` : ""}</Text></Text>
                <Text color={colors.text}>{icons.dot} Deps: <Text color={colors.number}>{scan.dependencies.prod} prod + {scan.dependencies.dev} dev</Text></Text>
                {scan.services.length > 0 && (
                  <Text color={colors.text}>{icons.dot} Services: <Text color={colors.warning}>{scan.services.join(", ")}</Text></Text>
                )}
                {scan.monorepo && (
                  <Text color={colors.text}>{icons.dot} Monorepo: <Text color={colors.keyword}>{scan.monorepo.type} ({scan.monorepo.packages.length} packages)</Text></Text>
                )}
              </Box>
            ) : (
              <Spinner label="Detecting..." />
            )}
          </Panel>
        </Box>
      </Box>

      {/* Chat input */}
      <ChatInput active={activePanel === 3} onSubmit={handleChat} />

      {/* Status bar */}
      <StatusBar
        stepProgress={stepProgress}
        aiStatus={isRunning ? "executing..." : undefined}
      />
    </Box>
  );
}
