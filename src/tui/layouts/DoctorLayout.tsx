import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { Panel } from "../components/Panel.js";
import { StatusBar } from "../components/StatusBar.js";
import { Spinner } from "../components/Spinner.js";
import { useNavigation } from "../hooks/useNavigation.js";
import { colors, icons } from "../theme.js";
import { runCommand } from "../../executor/index.js";
import type { ScanResult } from "../../scanner/index.js";

interface Check {
  label: string;
  status: "pass" | "fail" | "warn" | "checking";
  detail?: string;
}

interface DoctorLayoutProps {
  scan: ScanResult;
  cwd: string;
}

export function DoctorLayout({ scan, cwd }: DoctorLayoutProps) {
  const { exit } = useApp();
  const { activePanel } = useNavigation({ panelCount: 2, onQuit: () => exit() });
  const [checks, setChecks] = useState<Check[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    runDiagnostics(scan, cwd).then((results) => {
      setChecks(results);
      setDone(true);
    });
  }, []);

  return (
    <Box flexDirection="column" width="100%">
      <Box justifyContent="space-between">
        <Text color={colors.primary} bold> P-Setup Doctor</Text>
        <Text color={colors.textDim}>Health Check</Text>
      </Box>

      <Box flexDirection="row" flexGrow={1}>
        <Panel title="Diagnostics" active={activePanel === 0} width="60%">
          <Box flexDirection="column">
            {checks.map((c, i) => (
              <Box key={i}>
                <Text color={getCheckColor(c.status)}>
                  {getCheckIcon(c.status)} {c.label}
                </Text>
                {c.detail && <Text color={colors.textDim}> — {c.detail}</Text>}
              </Box>
            ))}
            {!done && <Spinner label="Running diagnostics..." />}
          </Box>
        </Panel>

        <Panel title="Environment" active={activePanel === 1} width="40%">
          <Box flexDirection="column">
            <Text color={colors.text}>{icons.dot} OS: <Text color={colors.info}>{process.platform}</Text></Text>
            <Text color={colors.text}>{icons.dot} Node: <Text color={colors.info}>{process.version}</Text></Text>
            <Text color={colors.text}>{icons.dot} Shell: <Text color={colors.info}>{process.env.SHELL || "unknown"}</Text></Text>
            <Text color={colors.text}>{icons.dot} PM: <Text color={colors.info}>{scan.packageManager || "none"}</Text></Text>
            <Text color={colors.text}>{icons.dot} Language: <Text color={colors.info}>{scan.language || "unknown"}</Text></Text>
          </Box>
        </Panel>
      </Box>

      <StatusBar stepProgress={done ? `${checks.length} checks done` : "checking..."} />
    </Box>
  );
}

async function runDiagnostics(scan: ScanResult, cwd: string): Promise<Check[]> {
  const checks: Check[] = [];

  // Runtime check
  if (scan.runtime) {
    try {
      const result = await runCommand(`${scan.runtime.name} --version`, cwd);
      const version = result.stdout.trim();
      checks.push({ label: `${scan.runtime.name} runtime`, status: "pass", detail: version });
    } catch {
      checks.push({ label: `${scan.runtime.name} runtime`, status: "fail", detail: "not found" });
    }
  }

  // Package manager
  if (scan.packageManager) {
    try {
      const result = await runCommand(`${scan.packageManager} --version`, cwd);
      checks.push({ label: `${scan.packageManager}`, status: "pass", detail: result.stdout.trim() });
    } catch {
      checks.push({ label: `${scan.packageManager}`, status: "fail", detail: "not installed" });
    }
  }

  // Dependencies installed
  if (scan.packageManager === "npm" || scan.packageManager === "yarn" || scan.packageManager === "pnpm") {
    try {
      const { access } = await import("fs/promises");
      const { join } = await import("path");
      await access(join(cwd, "node_modules"));
      checks.push({ label: "Dependencies installed", status: "pass" });
    } catch {
      checks.push({ label: "Dependencies installed", status: "fail", detail: "run install" });
    }
  }

  // Git
  try {
    await runCommand("git status", cwd);
    checks.push({ label: "Git repository", status: "pass" });
  } catch {
    checks.push({ label: "Git repository", status: "warn", detail: "not a git repo" });
  }

  // .env file
  if (scan.configFiles.includes(".env.example")) {
    try {
      const { access } = await import("fs/promises");
      const { join } = await import("path");
      await access(join(cwd, ".env"));
      checks.push({ label: ".env file", status: "pass" });
    } catch {
      checks.push({ label: ".env file", status: "warn", detail: "missing — run 'setup env init'" });
    }
  }

  // Ports (check common dev ports)
  const commonPorts = [3000, 5173, 8080, 4200];
  for (const port of commonPorts) {
    try {
      const result = await runCommand(`lsof -i :${port} -t`, cwd);
      if (result.stdout.trim()) {
        checks.push({ label: `Port ${port}`, status: "warn", detail: "in use" });
      }
    } catch {}
  }

  return checks;
}

function getCheckIcon(status: Check["status"]): string {
  switch (status) {
    case "pass": return icons.check;
    case "fail": return icons.cross;
    case "warn": return icons.warning;
    case "checking": return icons.spinner[0];
  }
}

function getCheckColor(status: Check["status"]): string {
  switch (status) {
    case "pass": return colors.success;
    case "fail": return colors.error;
    case "warn": return colors.warning;
    case "checking": return colors.textDim;
  }
}
