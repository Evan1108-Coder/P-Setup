import React, { useState, useEffect } from "react";
import { Text } from "ink";
import { colors, icons } from "../theme.js";

interface SpinnerProps {
  label?: string;
  color?: string;
}

export function Spinner({ label, color = colors.primary }: SpinnerProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % icons.spinner.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text color={color}>
      {icons.spinner[frame]}
      {label ? ` ${label}` : ""}
    </Text>
  );
}
