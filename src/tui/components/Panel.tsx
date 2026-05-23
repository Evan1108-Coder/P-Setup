import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";

interface PanelProps {
  title: string;
  active?: boolean;
  width?: number | string;
  height?: number | string;
  children: React.ReactNode;
}

export function Panel({ title, active = false, width, height, children }: PanelProps) {
  const borderColor = active ? colors.borderActive : colors.border;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      width={width}
      height={height}
      paddingX={1}
    >
      <Box marginBottom={0}>
        <Text color={active ? colors.primary : colors.textDim} bold={active}>
          {active ? "▸ " : "  "}
          {title}
        </Text>
      </Box>
      {children}
    </Box>
  );
}
