# Setup Guide

## Prerequisites

- Node.js 18 or later
- A terminal with Unicode support (for TUI features)
- npm, yarn, or pnpm

## Installation

### Via npx (recommended)

```bash
npx p-setup
```

This runs P-Setup without installing it globally.

### Global Installation

```bash
npm install -g p-setup
```

After installation, the `setup` command is available globally:

```bash
setup
setup doctor
setup info
```

### Development Setup

```bash
git clone https://github.com/Evan1108-Coder/P-Setup.git
cd P-Setup
npm install
npm run build
node dist/setup.js --help
```

## First Run

1. Navigate to any project directory
2. Run `setup` (or `npx p-setup`)
3. P-Setup will:
   - Display a pre-execution warning
   - Ask you to confirm (press Enter)
   - Launch the TUI
   - Scan your project
   - Plan and execute setup steps
   - Show a completion summary

## AI Features (Optional)

To enable AI-powered features, set the Minimax API key:

```bash
export MINIMAX_API_KEY=your-key-here
```

Or add it to your shell profile (`~/.zshrc` / `~/.bashrc`).

Without an API key, P-Setup works fully — it just uses pattern matching and heuristics instead of AI for step planning and chat responses.

## CI/CD Usage

For non-interactive environments:

```bash
setup --force --plain
```

This skips all prompts and outputs plain text (no TUI).
