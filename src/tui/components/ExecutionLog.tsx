import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";
import type { LogEntry } from "../../state/store.js";

interface ExecutionLogProps {
  logs: LogEntry[];
  maxLines?: number;
  currentStepTitle?: string;
  stepStatus?: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ExecutionLog({ logs, maxLines = 18, currentStepTitle, stepStatus }: ExecutionLogProps) {
  const visible = logs.slice(-maxLines);

  return (
    <Box flexDirection="column" flexGrow={1}>
      {currentStepTitle && (
        <Box marginBottom={0}>
          <Text color={stepStatus === "complete" ? colors.success : colors.accent} bold>
            {currentStepTitle} {stepStatus === "complete" ? "✓ complete" : stepStatus === "in progress" ? "in progress" : ""}
          </Text>
        </Box>
      )}
      {visible.map((entry) => (
        <LogLine key={entry.id} entry={entry} />
      ))}
      {logs.length === 0 && (
        <Text color={colors.textDim} italic>
          Waiting for execution to begin...
        </Text>
      )}
    </Box>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  const time = formatTime(entry.timestamp);
  const typeColor = getTypeColor(entry.type);
  const prefix = getTypePrefix(entry.type);

  return (
    <Box>
      <Text color={colors.textDim}>{time} </Text>
      <Text color={typeColor}>{prefix}</Text>
      <Text color={entry.type === "command" ? colors.textBright : colors.text}> {entry.content}</Text>
    </Box>
  );
}

function getTypeColor(type: LogEntry["type"]): string {
  switch (type) {
    case "success": return colors.success;
    case "warning": return colors.warning;
    case "error": return colors.error;
    case "command": return colors.textBright;
    case "progress": return colors.info;
    case "info": return colors.text;
  }
}

function getTypePrefix(type: LogEntry["type"]): string {
  switch (type) {
    case "success": return "✓";
    case "warning": return "△";
    case "error": return "✗";
    case "command": return "$";
    case "progress": return "…";
    case "info": return " ";
  }
}
