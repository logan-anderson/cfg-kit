# Config as Code Monorepo

This is a monorepo using pnpm workspaces and Turbo for build orchestration.

## Structure

- `packages/config-as-code/` - Main library package
- `examples/basic-example/` - Example usage of the library

## Features

The `config-as-code` library provides a type-safe way to define and validate environment variables using Zod schemas.

### Key Features

- 🔒 **Type Safety** - Full TypeScript support with proper type inference
- 🔍 **Runtime Validation** - Zod schema validation for all environment variables
- 🎯 **Client/Server Separation** - Separate validation for client and server-side variables
- 🔑 **Client Prefix Enforcement** - Enforces naming conventions for client-side variables
- 🔧 **Flexible Configuration** - Support for custom runtime environments and empty string handling
- 📦 **Tree Shakeable** - Built with modern bundling in mind

### Basic Usage

```typescript
import { defineConfig } from "config-as-code";
import { z } from "zod";

export const env = defineConfig({
  env: {
    server: {
      DATABASE_URL: z.string().url(),
      OPEN_AI_API_KEY: z.string().min(1),
    },
    clientPrefix: "PUBLIC_",
    client: {
      PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
  }
});

// The env object is now fully typed and validated
console.log(env.DATABASE_URL); // string (validated URL)
console.log(env.PUBLIC_CLERK_PUBLISHABLE_KEY); // string (validated)
```

### Configuration Options

- **`server`** - Server-side environment variables schema
- **`client`** - Client-side environment variables schema  
- **`clientPrefix`** - Required prefix for client-side variables (enforced at compile-time and runtime)
- **`runtimeEnv`** - Object containing environment variables (usually `process.env`)
- **`emptyStringAsUndefined`** - Treat empty strings as undefined (allows default values to work)

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