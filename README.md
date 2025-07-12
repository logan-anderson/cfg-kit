# Config as Code Monorepo

This is a monorepo using pnpm workspaces and Turbo for build orchestration.

## Structure

- `packages/config-as-code/` - Main library package
- `examples/basic-example/` - Example usage of the library

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- pnpm (version 8 or higher)

### Installation

```bash
# Install dependencies for all packages
pnpm install
```

### Development

```bash
# Start development mode for all packages
pnpm dev

# Build all packages
pnpm build

# Run tests for all packages
pnpm test

# Lint all packages
pnpm lint

# Clean build artifacts
pnpm clean
```

### Package-specific commands

```bash
# Work on a specific package
pnpm --filter config-as-code dev
pnpm --filter basic-example dev

# Build a specific package
pnpm --filter config-as-code build
```

## Adding New Packages

1. Create a new directory under `packages/` or `examples/`
2. Add a `package.json` with the appropriate scripts
3. The package will be automatically included in the workspace

## Scripts

- `pnpm dev` - Start development mode with hot reloading
- `pnpm build` - Build all packages
- `pnpm test` - Run tests across all packages
- `pnpm lint` - Lint all packages
- `pnpm clean` - Clean build artifacts

## Workspace Dependencies

Use `workspace:*` to reference other packages in the monorepo:

```json
{
  "dependencies": {
    "config-as-code": "workspace:*"
  }
}
``` 