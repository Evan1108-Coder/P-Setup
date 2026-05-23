# P-Setup

Intelligent project setup & management CLI. Auto-detects your stack, installs dependencies, configures environments, and keeps projects healthy. Supports 20+ languages with AI-assisted workflows. Features rich TUI with keyboard navigation, real-time status, and smart caching for near-zero AI costs.

## Installation

```bash
npx p-setup
```

Or install globally:

```bash
npm install -g p-setup
```

## Quick Start

```bash
# Full project setup (scan, install, configure, verify)
setup

# With no prompts (CI-friendly)
setup --force

# Plain terminal output (no TUI)
setup --plain
```

## Commands

### TUI Commands (Rich Interactive UI)

| Command | Description |
|---------|-------------|
| `setup` | Full project setup — scan, install runtime, deps, env, verify |
| `start` | Detect and run your project (dev server) |
| `doctor` | Diagnose environment health (runtimes, deps, ports) |
| `update` | Check for dependency updates with breaking change warnings |
| `clean` | Remove artifacts (`--deps`, `--share`, `--all`) |

### Non-TUI Commands (Plain Terminal)

| Command | Description |
|---------|-------------|
| `env [init\|check\|sync\|smart]` | Manage .env files |
| `info` | Show project summary |
| `list` | List available scripts/commands |
| `run <script>` | Run a project script |
| `switch <version>` | Switch runtime version |
| `add <package>` | Smart add dependency |
| `remove <package>` | Remove dependency |
| `port [number]` | Check/find/kill port |
| `deps` | Dependency tree, outdated, audit |
| `config` | Manage p-setup config |
| `lock` | Snapshot environment state |
| `diff` | Compare current vs locked state |
| `logs` | Tail project logs |
| `test` | Detect and run test suite |
| `build` | Detect and run build command |
| `deploy` | Run deploy scripts |
| `open [repo\|ide]` | Open in browser/IDE/repo |

## Features

### Smart Detection

P-Setup automatically detects:
- **Languages**: TypeScript, JavaScript, Python, Rust, Go, Java, Ruby, PHP, Dart, Elixir, Swift, C#, Kotlin, Scala, and more
- **Frameworks**: Next.js, Nuxt, SvelteKit, React, Vue, Angular, Express, Django, Flask, Rails, Spring Boot, and 20+ more
- **Package Managers**: npm, yarn, pnpm, bun, pip, poetry, cargo, go, bundler, composer, pub, mix
- **Services**: PostgreSQL, MySQL, MongoDB, Redis, RabbitMQ, Elasticsearch, Docker
- **Monorepos**: npm workspaces, pnpm workspaces, Turborepo, Lerna, Nx

### Detection Priority

1. `.p-setup.json` config file (explicit, highest priority)
2. `package.json` "p-setup" field
3. File-based scanning (lock files, config files)
4. Content analysis (dependency inspection)
5. AI fallback (novel situations only)

### AI-Powered Intelligence

P-Setup uses a 3-tier progressive intelligence system:

1. **Pattern Matching** (Level 0) — Free, instant. Handles ~80% of queries
2. **Cached Responses** (Level 1) — Free after first hit. Smart deduplication
3. **Live AI** (Level 2) — Only for novel situations. Uses compressed DSL for minimal token usage

### Environment Management

```bash
# Create .env from .env.example
setup env init

# Check for missing variables
setup env check

# Sync structure with .env.example
setup env sync

# Smart reorganize + auto-fill
setup env smart
```

### Checkpoint & Resume

- Progress saved to `.p-setup/checkpoint.json`
- Persists across terminals and reboots
- Automatically cleaned up on success
- Resume interrupted setups seamlessly

## Flags

| Flag | Description |
|------|-------------|
| `--force` | Skip all prompts, install what project specifies (latest if unspecified) |
| `--no-tui` / `--plain` | Plain terminal output for CI/CD, piping, SSH |

## Configuration

Global config stored at `~/.p-setup/config.json`:

```json
{
  "ai": { "enabled": true },
  "preferences": {
    "theme": "dark",
    "confirmBeforeInstall": true
  }
}
```

Project-level config via `.p-setup.json`:

```json
{
  "language": "TypeScript",
  "framework": "Next.js",
  "runtime": "node",
  "packageManager": "pnpm"
}
```

## TUI Navigation

- **Arrow keys / Tab**: Navigate between panels
- **Enter**: Confirm / Submit
- **/** : Focus chat input
- **q**: Quit

## Requirements

- Node.js >= 18.0.0
- Terminal with Unicode support (for TUI mode)

## License

MIT
