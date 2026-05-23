import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { Panel } from "../components/Panel.js";
import { StatusBar } from "../components/StatusBar.js";
import { Spinner } from "../components/Spinner.js";
import { useNavigation } from "../hooks/useNavigation.js";
import { colors, icons } from "../theme.js";
import { runCommand } from "../../executor/index.js";
import type { ScanResult } from "../../scanner/index.js";

interface StartLayoutProps {
  scan: ScanResult;
  cwd: string;
}

export function StartLayout({ scan, cwd }: StartLayoutProps) {
  const { exit } = useApp();
  const { activePanel } = useNavigation({ panelCount: 2, onQuit: () => exit() });
  const [status, setStatus] = useState<"detecting" | "running" | "failed" | "stopped">("detecting");
  const [command, setCommand] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>([]);

  useEffect(() => {
    const startCmd = detectStartCommand(scan);
    if (startCmd) {
      setCommand(startCmd);
      setStatus("running");
      runCommand(startCmd, cwd, (line) => {
        setOutput((prev) => [...prev.slice(-30), line]);
      }).then((result) => {
        if (result.exitCode !== 0) setStatus("failed");
        else setStatus("stopped");
      });
    } else {
      setStatus("failed");
    }
  }, []);

  return (
    <Box flexDirection="column" width="100%">
      <Box justifyContent="space-between">
        <Text color={colors.primary} bold> P-Setup Start</Text>
        <Text color={colors.textDim}>{command || "detecting..."}</Text>
      </Box>

      <Box flexDirection="row" flexGrow={1}>
        <Panel title="Output" active={activePanel === 0} width="70%">
          <Box flexDirection="column">
            {status === "detecting" && <Spinner label="Detecting start command..." />}
            {status === "running" && (
              <>
                <Box marginBottom={1}>
                  <Text color={colors.success}>{icons.dot} Running: </Text>
                  <Text color={colors.accent}>{command}</Text>
                </Box>
                {output.slice(-15).map((line, i) => (
                  <Text key={i} color={colors.text}>{line}</Text>
                ))}
              </>
            )}
            {status === "failed" && (
              <Text color={colors.error}>{icons.cross} No start command found. Add "dev" or "start" script to package.json.</Text>
            )}
          </Box>
        </Panel>

        <Panel title="Info" active={activePanel === 1} width="30%">
          <Box flexDirection="column">
            <Text color={colors.text}>{icons.dot} PM: {scan.packageManager}</Text>
            <Text color={colors.text}>{icons.dot} Scripts:</Text>
            {Object.keys(scan.scripts).slice(0, 8).map((s) => (
              <Text key={s} color={colors.textDim}>  {s}</Text>
            ))}
          </Box>
        </Panel>
      </Box>

      <StatusBar stepProgress={status} />
    </Box>
  );
}

function detectStartCommand(scan: ScanResult): string | null {
  const pm = scan.packageManager || "npm";
  if (scan.scripts.dev) return `${pm} run dev`;
  if (scan.scripts.start) return `${pm} run start`;
  if (scan.scripts.serve) return `${pm} run serve`;
  if (scan.scripts.develop) return `${pm} run develop`;
  return null;
}
