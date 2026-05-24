import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { colors, icons } from "../theme.js";

interface EnvInputProps {
  varKey: string;
  remainingCount: number;
  onSubmit: (value: string) => void;
  onSkip: () => void;
  isSensitive?: boolean;
}

export function EnvInput({ varKey, remainingCount, onSubmit, onSkip, isSensitive = false }: EnvInputProps) {
  const [value, setValue] = useState("");

  useInput((input, key) => {
    if (key.escape) {
      onSkip();
    }
  });

  const handleSubmit = (text: string) => {
    onSubmit(text);
    setValue("");
  };

  const sensitive = isSensitive || varKey.includes("SECRET") || varKey.includes("KEY") || varKey.includes("TOKEN") || varKey.includes("PASSWORD");

  return (
    <Box flexDirection="column" width="100%">
      <Box>
        <Text color={colors.accent}>{icons.arrowRight} </Text>
        <Text color={colors.textBright} bold>{varKey}</Text>
        <Text color={colors.textDim}> (paste key or press Enter to skip — {remainingCount} more vars after this)</Text>
      </Box>
      <Box
        borderStyle="single"
        borderColor={colors.borderActive}
        paddingX={1}
        width="60%"
      >
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder=""
          mask={sensitive ? "•" : undefined}
        />
      </Box>
      <Box>
        <Text color={colors.textDim}>[Enter] confirm  [Esc] skip</Text>
      </Box>
    </Box>
  );
}
