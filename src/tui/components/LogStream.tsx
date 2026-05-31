import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";
import type { AppMessage } from "../../state/store.js";

interface LogStreamProps {
  messages: AppMessage[];
  maxLines?: number;
}

export function LogStream({ messages, maxLines = 15 }: LogStreamProps) {
  const visibleMessages = messages.slice(-maxLines);

  return (
    <Box flexDirection="column" flexGrow={1}>
      {visibleMessages.map((msg) => (
        <MessageLine key={msg.id} message={msg} />
      ))}
      {messages.length === 0 && (
        <Text color={colors.textDim} italic>
          AI brain ready. Waiting for setup to begin...
        </Text>
      )}
    </Box>
  );
}

function MessageLine({ message }: { message: AppMessage }) {
  const time = new Date(message.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const roleColor = getRoleColor(message.role);
  const prefix = getRolePrefix(message);

  return (
    <Box>
      <Text color={colors.textDim}>[{time}] </Text>
      <Text color={roleColor}>{prefix}</Text>
      <Text color={colors.text}> {message.content}</Text>
      {message.level && (
        <Text color={colors.textDim}> {getLevelIndicator(message.level, message.cost)}</Text>
      )}
    </Box>
  );
}

function getRoleColor(role: AppMessage["role"]): string {
  switch (role) {
    case "assistant": return colors.primary;
    case "user": return colors.accent;
    case "steer": return colors.keyword;
    case "thinking": return colors.keyword;
    case "system": return colors.textDim;
  }
}

function getRolePrefix(msg: AppMessage): string {
  switch (msg.role) {
    case "assistant": return "AI →";
    case "user": return "You →";
    case "steer": return "◆ Steer →";
    case "thinking": return "💭";
    case "system": return "sys →";
  }
}

function getLevelIndicator(level: string, cost?: number): string {
  switch (level) {
    case "pattern": return "⚡";
    case "cached": return "📦";
    case "live": return `🧠 ~$${(cost || 0).toFixed(4)}`;
    default: return "";
  }
}
