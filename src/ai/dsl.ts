import type { ScanResult } from "../scanner/index.js";

export interface ProjectContext {
  cwd: string;
  scan: ScanResult;
  collectedAt?: number;
  cacheHit?: boolean;
  terminal: {
    shell: string;
    term: string;
    columns: number;
    rows: number;
    platform: string;
    nodeVersion: string;
  };
  git: {
    isRepo: boolean;
    branch?: string;
    remoteUrl?: string;
    isDirty?: boolean;
  };
  envVars: {
    defined: string[];
    missing: string[];
    templateKeys?: string[];
  };
  fileTree: string[];
  documents?: Array<{
    path: string;
    kind: "readme" | "docs" | "setup" | "contributing" | "env" | "docker" | "ci" | "config";
    excerpt: string;
  }>;
  packageScripts?: Array<{
    name: string;
    command: string;
    score: number;
    reason: string;
  }>;
  setupHints?: string[];
  docker?: {
    files: string[];
    composeFiles: string[];
  };
  ci?: {
    files: string[];
  };
}

export function contextToDSL(ctx: ProjectContext): string {
  const parts: string[] = [];

  // Project info
  const prj: string[] = [];
  if (ctx.scan.language) prj.push(`lang=${ctx.scan.language}`);
  if (ctx.scan.framework) prj.push(`fw=${ctx.scan.framework}`);
  if (ctx.scan.packageManager) prj.push(`pm=${ctx.scan.packageManager}`);
  if (ctx.scan.runtime) prj.push(`rt=${ctx.scan.runtime.name}${ctx.scan.runtime.version ? `@${ctx.scan.runtime.version}` : ""}`);
  prj.push(`deps=${ctx.scan.dependencies.prod}+${ctx.scan.dependencies.dev}dev`);
  if (ctx.scan.monorepo) prj.push(`mono=${ctx.scan.monorepo.type}(${ctx.scan.monorepo.packages.length})`);
  parts.push(`[PRJ ${prj.join(" ")}]`);

  // Git
  if (ctx.git.isRepo) {
    const g: string[] = [];
    if (ctx.git.branch) g.push(`br=${ctx.git.branch}`);
    if (ctx.git.isDirty) g.push("dirty=y");
    parts.push(`[GIT ${g.join(" ")}]`);
  }

  // System
  parts.push(`[SYS ${ctx.terminal.platform} ${ctx.terminal.shell} node=${ctx.terminal.nodeVersion}]`);

  // Services
  if (ctx.scan.services.length > 0) {
    parts.push(`[SVC ${ctx.scan.services.join(",")}]`);
  }

  // Missing env vars
  if (ctx.envVars.missing.length > 0) {
    parts.push(`[ENV miss=${ctx.envVars.missing.slice(0, 5).join(",")}]`);
  }

  if (ctx.packageScripts?.length) {
    parts.push(`[SCRIPTS ${ctx.packageScripts.slice(0, 8).map((s) => `${s.name}:${s.score}`).join(",")}]`);
  }

  if (ctx.documents?.length) {
    parts.push(`[DOCS ${ctx.documents.slice(0, 8).map((doc) => `${doc.kind}:${doc.path}`).join(",")}]`);
  }

  if (ctx.setupHints?.length) {
    parts.push(`[HINTS ${ctx.setupHints.slice(0, 6).join(" | ")}]`);
  }

  return parts.join(" ");
}

export function scanResultToDSL(scan: ScanResult): string {
  const parts: string[] = [];
  if (scan.language) parts.push(`lang=${scan.language}`);
  if (scan.framework) parts.push(`fw=${scan.framework}`);
  if (scan.packageManager) parts.push(`pm=${scan.packageManager}`);
  if (scan.runtime) parts.push(`rt=${scan.runtime.name}`);
  if (scan.services.length) parts.push(`svc=${scan.services.join(",")}`);
  if (scan.monorepo) parts.push(`mono=${scan.monorepo.type}`);
  return parts.join(" ");
}
