import React from "react";
import { Box, Text } from "ink";
import { colors, icons } from "../theme.js";
import type { SetupStep } from "../../ai/planner.js";
import type { ScanResult } from "../../scanner/index.js";

interface SummaryProps {
  scan: ScanResult;
  steps: SetupStep[];
  duration: number;
}

export function Summary({ scan, steps, duration }: SummaryProps) {
  const succeeded = steps.filter((s) => s.status === "done").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text color={colors.success} bold>
          {icons.rocket} Setup Complete
        </Text>
      </Box>

      {/* Project info */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color={colors.textBright} bold>Project:</Text>
        <Text color={colors.text}>
          {"  "}
          {icons.dot} {scan.language || "Unknown"}{scan.framework ? ` / ${scan.framework}` : ""}
        </Text>
        <Text color={colors.text}>
          {"  "}
          {icons.dot} Package Manager: {scan.packageManager || "none"}
        </Text>
        {scan.services.length > 0 && (
          <Text color={colors.text}>
            {"  "}
            {icons.dot} Services: {scan.services.join(", ")}
          </Text>
        )}
      </Box>

      {/* Step results */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color={colors.textBright} bold>Steps:</Text>
        <Text color={colors.success}>
          {"  "}
          {icons.check} {succeeded} completed
        </Text>
        {failed > 0 && (
          <Text color={colors.error}>
            {"  "}
            {icons.cross} {failed} failed
          </Text>
        )}
        {skipped > 0 && (
          <Text color={colors.textDim}>
            {"  "}
            {icons.circle} {skipped} skipped
          </Text>
        )}
      </Box>

      {/* Warnings for failed steps */}
      {failed > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={colors.warning} bold>{icons.warning} Warnings:</Text>
          {steps
            .filter((s) => s.status === "failed")
            .map((s) => (
              <Text key={s.id} color={colors.warning}>
                {"  "}{icons.arrow} {s.label}: {s.error || "unknown error"}
              </Text>
            ))}
        </Box>
      )}

      {/* Duration */}
      <Box>
        <Text color={colors.textDim}>
          Completed in {formatDuration(duration)}
        </Text>
      </Box>
    </Box>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
