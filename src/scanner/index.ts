import { detectFromConfig } from "./configDetector.js";
import { detectLanguage } from "./languageDetector.js";
import { detectFramework } from "./frameworkDetector.js";
import { detectPackageManager } from "./packageManager.js";
import { detectRuntime } from "./runtimeDetector.js";
import { detectServices } from "./serviceDetector.js";
import { detectMonorepo } from "./monorepoDetector.js";

export interface ScanResult {
  language: string | null;
  framework: string | null;
  packageManager: string | null;
  runtime: { name: string; version: string | null } | null;
  services: string[];
  monorepo: { type: string; packages: string[] } | null;
  scripts: Record<string, string>;
  dependencies: { prod: number; dev: number };
  configFiles: string[];
}

export async function scanProject(cwd: string): Promise<ScanResult> {
  const configResult = await detectFromConfig(cwd);

  const [language, framework, packageManager, runtime, services, monorepo] =
    await Promise.all([
      configResult?.language
        ? Promise.resolve(configResult.language)
        : detectLanguage(cwd),
      configResult?.framework
        ? Promise.resolve(configResult.framework)
        : detectFramework(cwd),
      detectPackageManager(cwd),
      detectRuntime(cwd),
      detectServices(cwd),
      detectMonorepo(cwd),
    ]);

  const scripts = await getScripts(cwd, packageManager);
  const deps = await getDependencyCounts(cwd);
  const configFiles = await findConfigFiles(cwd);

  return {
    language: configResult?.language || language,
    framework: configResult?.framework || framework,
    packageManager,
    runtime,
    services,
    monorepo,
    scripts,
    dependencies: deps,
    configFiles,
  };
}

async function getScripts(
  cwd: string,
  pm: string | null
): Promise<Record<string, string>> {
  const { readFile } = await import("fs/promises");
  const { join } = await import("path");
  try {
    if (pm === "npm" || pm === "yarn" || pm === "pnpm" || pm === "bun") {
      const pkg = JSON.parse(
        await readFile(join(cwd, "package.json"), "utf-8")
      );
      return pkg.scripts || {};
    }
  } catch {}
  return {};
}

async function getDependencyCounts(
  cwd: string
): Promise<{ prod: number; dev: number }> {
  const { readFile } = await import("fs/promises");
  const { join } = await import("path");
  try {
    const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf-8"));
    return {
      prod: Object.keys(pkg.dependencies || {}).length,
      dev: Object.keys(pkg.devDependencies || {}).length,
    };
  } catch {
    return { prod: 0, dev: 0 };
  }
}

async function findConfigFiles(cwd: string): Promise<string[]> {
  const { readdir } = await import("fs/promises");
  const configs: string[] = [];
  const known = [
    "package.json",
    "tsconfig.json",
    "vite.config.ts",
    "next.config.js",
    "next.config.mjs",
    "webpack.config.js",
    ".eslintrc.json",
    ".eslintrc.js",
    "eslint.config.js",
    ".prettierrc",
    "prettier.config.js",
    "jest.config.ts",
    "vitest.config.ts",
    "tailwind.config.js",
    "tailwind.config.ts",
    "postcss.config.js",
    "docker-compose.yml",
    "docker-compose.yaml",
    "Dockerfile",
    ".env.example",
    ".env.local",
    "Makefile",
    "Cargo.toml",
    "go.mod",
    "pyproject.toml",
    "setup.py",
    "requirements.txt",
    "Gemfile",
    "mix.exs",
    "pubspec.yaml",
    "composer.json",
    ".p-setup.json",
  ];
  try {
    const files = await readdir(cwd);
    for (const f of files) {
      if (known.includes(f)) configs.push(f);
    }
  } catch {}
  return configs;
}
