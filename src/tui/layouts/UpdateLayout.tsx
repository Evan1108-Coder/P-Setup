import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { Panel } from "../components/Panel.js";
import { StatusBar } from "../components/StatusBar.js";
import { Spinner } from "../components/Spinner.js";
import { useNavigation } from "../hooks/useNavigation.js";
import { colors, icons } from "../theme.js";
import { runCommand } from "../../executor/index.js";
import type { ScanResult } from "../../scanner/index.js";

interface OutdatedPkg {
  name: string;
  current: string;
  latest: string;
  type: "major" | "minor" | "patch";
}

interface UpdateLayoutProps {
  scan: ScanResult;
  cwd: string;
}

export function UpdateLayout({ scan, cwd }: UpdateLayoutProps) {
  const { exit } = useApp();
  const { activePanel } = useNavigation({ panelCount: 2, onQuit: () => exit() });
  const [packages, setPackages] = useState<OutdatedPkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    checkOutdated(scan, cwd).then((pkgs) => {
      setPackages(pkgs);
      setLoading(false);
    });
  }, []);

  return (
    <Box flexDirection="column" width="100%">
      <Box justifyContent="space-between">
        <Text color={colors.primary} bold> P-Setup Update</Text>
        <Text color={colors.textDim}>{packages.length} outdated packages</Text>
      </Box>

      <Box flexDirection="row" flexGrow={1}>
        <Panel title="Outdated Dependencies" active={activePanel === 0} width="65%">
          <Box flexDirection="column">
            {loading && <Spinner label="Checking for updates..." />}
            {!loading && packages.length === 0 && (
              <Text color={colors.success}>{icons.check} All dependencies up to date!</Text>
            )}
            {packages.map((pkg) => (
              <Box key={pkg.name}>
                <Text color={getTypeColor(pkg.type)}>
                  {pkg.type === "major" ? icons.warning : icons.dot} {pkg.name}
                </Text>
                <Text color={colors.textDim}> {pkg.current} → </Text>
                <Text color={getTypeColor(pkg.type)}>{pkg.latest}</Text>
                {pkg.type === "major" && <Text color={colors.error}> BREAKING</Text>}
              </Box>
            ))}
          </Box>
        </Panel>

        <Panel title="Summary" active={activePanel === 1} width="35%">
          <Box flexDirection="column">
            <Text color={colors.error}>{icons.dot} Major: {packages.filter((p) => p.type === "major").length}</Text>
            <Text color={colors.warning}>{icons.dot} Minor: {packages.filter((p) => p.type === "minor").length}</Text>
            <Text color={colors.success}>{icons.dot} Patch: {packages.filter((p) => p.type === "patch").length}</Text>
          </Box>
        </Panel>
      </Box>

      <StatusBar stepProgress={loading ? "checking..." : `${packages.length} outdated`} />
    </Box>
  );
}

async function checkOutdated(scan: ScanResult, cwd: string): Promise<OutdatedPkg[]> {
  const pm = scan.packageManager || "npm";
  try {
    const result = await runCommand(`${pm} outdated --json`, cwd);
    const data = JSON.parse(result.stdout || "{}");
    return Object.entries(data).map(([name, info]: [string, any]) => ({
      name,
      current: info.current || "?",
      latest: info.latest || "?",
      type: classifyUpdate(info.current, info.latest),
    }));
  } catch {
    return [];
  }
}

function classifyUpdate(current: string, latest: string): "major" | "minor" | "patch" {
  const curr = current.replace(/[^0-9.]/g, "").split(".");
  const lat = latest.replace(/[^0-9.]/g, "").split(".");
  if (curr[0] !== lat[0]) return "major";
  if (curr[1] !== lat[1]) return "minor";
  return "patch";
}

function getTypeColor(type: OutdatedPkg["type"]): string {
  switch (type) {
    case "major": return colors.error;
    case "minor": return colors.warning;
    case "patch": return colors.success;
  }
}
