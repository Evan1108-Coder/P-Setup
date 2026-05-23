import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { colors } from "../theme.js";

interface ChatInputProps {
  active: boolean;
  onSubmit: (text: string) => void;
  placeholder?: string;
  isSensitive?: boolean;
}

export function ChatInput({ active, onSubmit, placeholder = "Ask anything...", isSensitive = false }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (text: string) => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setValue("");
  };

  return (
    <Box
      borderStyle="round"
      borderColor={active ? colors.borderActive : colors.border}
      paddingX={1}
      width="100%"
    >
      <Text color={colors.primary}>❯ </Text>
      {active ? (
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={placeholder}
          mask={isSensitive ? "•" : undefined}
        />
      ) : (
        <Text color={colors.textDim}>{placeholder}</Text>
      )}
    </Box>
  );
}
