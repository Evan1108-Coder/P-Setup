import React from "react";
import { Box, Text } from "ink";
import { colors, shortcuts } from "../theme.js";

interface FooterBarProps {
  version: string;
  checkpointPath: string;
}

export function FooterBar({ version, checkpointPath }: FooterBarProps) {
  return (
    <Box width="100%" justifyContent="space-between">
      <Box gap={2}>
        {shortcuts.map((s) => (
          <Box key={s.key}>
            <Text color={colors.accent} bold>{s.key}</Text>
            <Text color={colors.textDim}> {s.desc}</Text>
          </Box>
        ))}
      </Box>
      <Box>
        <Text color={colors.textDim}>{version} · checkpoint: {checkpointPath}</Text>
      </Box>
    </Box>
  );
}
