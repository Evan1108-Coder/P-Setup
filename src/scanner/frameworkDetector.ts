import { readFile, access } from "fs/promises";
import { join } from "path";

interface FrameworkSignal {
  name: string;
  deps?: string[];
  files?: string[];
  devDeps?: string[];
}

const FRAMEWORKS: FrameworkSignal[] = [
  { name: "Next.js", deps: ["next"], files: ["next.config.js", "next.config.mjs", "next.config.ts"] },
  { name: "Nuxt", deps: ["nuxt"], files: ["nuxt.config.ts", "nuxt.config.js"] },
  { name: "SvelteKit", deps: ["@sveltejs/kit"], files: ["svelte.config.js"] },
  { name: "Remix", deps: ["@remix-run/react"] },
  { name: "Astro", deps: ["astro"], files: ["astro.config.mjs", "astro.config.ts"] },
  { name: "Vite", deps: ["vite"], files: ["vite.config.ts", "vite.config.js"] },
  { name: "React", deps: ["react", "react-dom"] },
  { name: "Vue", deps: ["vue"] },
  { name: "Svelte", deps: ["svelte"] },
  { name: "Angular", deps: ["@angular/core"], files: ["angular.json"] },
  { name: "Express", deps: ["express"] },
  { name: "Fastify", deps: ["fastify"] },
  { name: "Hono", deps: ["hono"] },
  { name: "Elysia", deps: ["elysia"] },
  { name: "NestJS", deps: ["@nestjs/core"] },
  { name: "Koa", deps: ["koa"] },
  { name: "Django", files: ["manage.py", "django.conf"] },
  { name: "Flask", files: ["app.py"] },
  { name: "FastAPI", files: ["main.py"] },
  { name: "Rails", files: ["Gemfile", "config/routes.rb"] },
  { name: "Spring Boot", files: ["pom.xml", "src/main/java"] },
  { name: "Laravel", files: ["artisan", "composer.json"] },
  { name: "Phoenix", files: ["mix.exs", "lib/*_web"] },
  { name: "Flutter", files: ["pubspec.yaml", "lib/main.dart"] },
  { name: "React Native", deps: ["react-native"] },
  { name: "Electron", deps: ["electron"] },
  { name: "Tauri", deps: ["@tauri-apps/api"], files: ["src-tauri/tauri.conf.json"] },
  { name: "Gatsby", deps: ["gatsby"] },
  { name: "Solid", deps: ["solid-js"] },
  { name: "Qwik", deps: ["@builder.io/qwik"] },
];

export async function detectFramework(cwd: string): Promise<string | null> {
  let allDeps: Record<string, string> = {};

  try {
    const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf-8"));
    allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {}

  for (const fw of FRAMEWORKS) {
    // Check deps
    if (fw.deps?.some((d) => d in allDeps)) {
      return fw.name;
    }

    // Check files
    if (fw.files) {
      for (const f of fw.files) {
        if (f.includes("*")) continue;
        try {
          await access(join(cwd, f));
          return fw.name;
        } catch {}
      }
    }
  }

  return null;
}
