export interface CompressedDocumentFacts {
  path: string;
  kind: string;
  install: string[];
  run: string[];
  test: string[];
  build: string[];
  migrate: string[];
  env: string[];
  services: string[];
  ports: string[];
  notes: string[];
}

const COMMAND_PATTERNS = [
  /\b(?:npm|pnpm|yarn|bun)\s+(?:install|i|add|dev|start|test|build|run\s+[A-Za-z0-9:_-]+|[A-Za-z0-9:_-]+)\b/gi,
  /\b(?:python|python3|pip|pip3|uv|poetry)\s+[A-Za-z0-9:_./-]+(?:\s+[A-Za-z0-9:_./-]+)?/gi,
  /\b(?:cargo|go)\s+[A-Za-z0-9:_./-]+(?:\s+[A-Za-z0-9:_./-]+)?/gi,
  /\b(?:docker\s+compose|docker-compose|docker)\s+[A-Za-z0-9:_./-]+(?:\s+[A-Za-z0-9:_./-]+)?/gi,
  /\b(?:prisma|alembic|rails|php artisan)\s+[A-Za-z0-9:_./-]+(?:\s+[A-Za-z0-9:_./-]+)?/gi,
];

export function compressDocumentExcerpt(path: string, kind: string, excerpt: string): string {
  const facts = extractDocumentFacts(path, kind, excerpt);
  return formatDocumentFacts(facts);
}

export function extractDocumentFacts(path: string, kind: string, excerpt: string): CompressedDocumentFacts {
  const text = excerpt.replace(/\r\n/g, "\n");
  const lower = text.toLowerCase();
  const commands = extractCommands(text);
  const env = unique([
    ...[...text.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)].map((match) => match[0]),
    ...[...text.matchAll(/\.env(?:\.[A-Za-z0-9_-]+)?/g)].map((match) => match[0]),
  ]).filter((item) => !["README", "HTTP", "HTTPS", "JSON", "YAML", "TOML"].includes(item));

  const services = unique([
    ...matches(lower, /\b(postgres(?:ql)?|mysql|mariadb|redis|mongodb|mongo|sqlite|elasticsearch|kafka|rabbitmq|docker compose|docker-compose)\b/g),
  ]);
  const ports = unique(matches(text, /\b(?:port\s*)?(?:localhost:|127\.0\.0\.1:)?([1-9][0-9]{2,4})\b/g));
  const notes = extractNotes(text);

  return {
    path,
    kind,
    install: commands.filter((command) => /\b(?:install| i | add |pip|poetry install|uv sync)\b/i.test(` ${command} `)),
    run: commands.filter((command) => /\b(?:dev|start|serve|runserver|docker compose up|docker-compose up)\b/i.test(command)),
    test: commands.filter((command) => /\btest\b/i.test(command)),
    build: commands.filter((command) => /\bbuild\b/i.test(command)),
    migrate: commands.filter((command) => /\b(?:migrate|migration|prisma|alembic)\b/i.test(command)),
    env: env.slice(0, 20),
    services: services.slice(0, 12),
    ports: ports.slice(0, 12),
    notes: notes.slice(0, 8),
  };
}

export function compactDocumentsBlock(
  documents: Array<{ path: string; kind: string; compact?: string; excerpt: string }> | undefined,
  maxDocs = 10
): string {
  if (!documents?.length) return "docs:none";
  return documents
    .slice(0, maxDocs)
    .map((doc) => doc.compact || compressDocumentExcerpt(doc.path, doc.kind, doc.excerpt))
    .join("\n");
}

function formatDocumentFacts(facts: CompressedDocumentFacts): string {
  const parts = [
    `docs.${facts.kind}:${facts.path}`,
    facts.install.length ? `install=${facts.install.slice(0, 4).join(" && ")}` : "",
    facts.env.length ? `env=${facts.env.slice(0, 8).join(",")}` : "",
    facts.migrate.length ? `db=${facts.migrate.slice(0, 3).join(" && ")}` : "",
    facts.run.length ? `run=${facts.run.slice(0, 4).join(" && ")}` : "",
    facts.test.length ? `test=${facts.test.slice(0, 3).join(" && ")}` : "",
    facts.build.length ? `build=${facts.build.slice(0, 3).join(" && ")}` : "",
    facts.services.length ? `svc=${facts.services.join(",")}` : "",
    facts.ports.length ? `ports=${facts.ports.join(",")}` : "",
    facts.notes.length ? `note=${facts.notes.join(" | ")}` : "",
  ].filter(Boolean);
  return parts.join("; ");
}

function extractCommands(text: string): string[] {
  const commands: string[] = [];
  for (const pattern of COMMAND_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      commands.push(cleanCommand(match[0]));
    }
  }
  return unique(commands).slice(0, 24);
}

function cleanCommand(command: string): string {
  return command
    .replace(/[`"'.,;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function extractNotes(text: string): string[] {
  const notes: string[] = [];
  for (const line of text.split("\n")) {
    const clean = line.replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim();
    if (!clean || clean.length > 180) continue;
    if (/\b(node|python|version|required|requires|before|after|copy|create|local|credential|secret|api key|database|docker)\b/i.test(clean)) {
      notes.push(clean);
    }
  }
  return unique(notes);
}

function matches(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[1] || match[0]);
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}
