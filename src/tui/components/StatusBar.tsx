import React from "react";
import { Box, Text } from "ink";
import { colors, shortcuts } from "../theme.js";

interface StatusBarProps {
  stepProgress: string;
  aiStatus?: string;
}

export function StatusBar({ stepProgress, aiStatus }: StatusBarProps) {
  return (
    <Box flexDirection="row" justifyContent="space-between" width="100%">
      <Box gap={2}>
        {shortcuts.map((s) => (
          <Box key={s.key}>
            <Text color={colors.accent}>{s.key}</Text>
            <Text color={colors.textDim}> {s.desc}</Text>
          </Box>
        ))}
      </Box>
      <Box gap={2}>
        {aiStatus && <Text color={colors.info}>{aiStatus}</Text>}
        <Text color={colors.success}>{stepProgress}</Text>
      </Box>
    </Box>
  );
}
