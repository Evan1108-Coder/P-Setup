import { readdir, readFile } from "fs/promises";
import { join } from "path";

const LANGUAGE_SIGNALS: Record<string, { files: string[]; extensions: string[] }> = {
  TypeScript: {
    files: ["tsconfig.json", "tsconfig.base.json"],
    extensions: [".ts", ".tsx"],
  },
  JavaScript: {
    files: ["package.json", "jsconfig.json"],
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
  },
  Python: {
    files: ["pyproject.toml", "setup.py", "setup.cfg", "Pipfile", "requirements.txt", "poetry.lock"],
    extensions: [".py"],
  },
  Rust: {
    files: ["Cargo.toml", "Cargo.lock"],
    extensions: [".rs"],
  },
  Go: {
    files: ["go.mod", "go.sum"],
    extensions: [".go"],
  },
  Java: {
    files: ["pom.xml", "build.gradle", "build.gradle.kts"],
    extensions: [".java"],
  },
  Kotlin: {
    files: ["build.gradle.kts"],
    extensions: [".kt", ".kts"],
  },
  Ruby: {
    files: ["Gemfile", "Gemfile.lock", "Rakefile"],
    extensions: [".rb"],
  },
  PHP: {
    files: ["composer.json", "composer.lock"],
    extensions: [".php"],
  },
  Swift: {
    files: ["Package.swift", "*.xcodeproj"],
    extensions: [".swift"],
  },
  "C#": {
    files: ["*.csproj", "*.sln"],
    extensions: [".cs"],
  },
  Dart: {
    files: ["pubspec.yaml", "pubspec.lock"],
    extensions: [".dart"],
  },
  Elixir: {
    files: ["mix.exs", "mix.lock"],
    extensions: [".ex", ".exs"],
  },
  Scala: {
    files: ["build.sbt"],
    extensions: [".scala"],
  },
  Clojure: {
    files: ["project.clj", "deps.edn"],
    extensions: [".clj", ".cljs"],
  },
  Haskell: {
    files: ["stack.yaml", "cabal.project"],
    extensions: [".hs"],
  },
  Zig: {
    files: ["build.zig"],
    extensions: [".zig"],
  },
  C: {
    files: ["CMakeLists.txt", "Makefile"],
    extensions: [".c", ".h"],
  },
  "C++": {
    files: ["CMakeLists.txt"],
    extensions: [".cpp", ".cc", ".cxx", ".hpp"],
  },
  Lua: {
    files: [".luarocks"],
    extensions: [".lua"],
  },
};

export async function detectLanguage(cwd: string): Promise<string | null> {
  try {
    const files = await readdir(cwd);
    const fileSet = new Set(files);

    // Check TypeScript first (more specific)
    if (fileSet.has("tsconfig.json") || fileSet.has("tsconfig.base.json")) {
      return "TypeScript";
    }

    // Check package.json for typescript dependency
    if (fileSet.has("package.json")) {
      try {
        const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf-8"));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps.typescript) return "TypeScript";
      } catch {}
    }

    // JavaScript takes priority if package.json has real dependencies
    if (fileSet.has("package.json")) {
      try {
        const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf-8"));
        const depCount = Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length;
        if (depCount > 0) return "JavaScript";
      } catch {}
    }

    // Check other languages by file presence
    for (const [lang, signals] of Object.entries(LANGUAGE_SIGNALS)) {
      if (lang === "TypeScript" || lang === "JavaScript") continue;
      for (const f of signals.files) {
        if (!f.includes("*") && fileSet.has(f)) return lang;
      }
    }

    // JavaScript as fallback if package.json exists
    if (fileSet.has("package.json")) return "JavaScript";

    // Check by file extensions in directory
    for (const [lang, signals] of Object.entries(LANGUAGE_SIGNALS)) {
      for (const file of files) {
        if (signals.extensions.some((ext) => file.endsWith(ext))) {
          return lang;
        }
      }
    }
  } catch {}
  return null;
}
