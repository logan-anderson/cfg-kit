# cfg-kit

A TypeScript configuration toolkit with automatic type inference and plugin support.

## Features

- 🔒 **Type Safety** - Full TypeScript support with automatic type inference
- 🔍 **Validation** - Zod schema validation for environment variables
- ⚡ **Async Support** - Define configuration values asynchronously
- 🎯 **Client/Server Separation** - Separate builds for client and server-side configs
- 🔧 **Plugin System** - Extensible with plugins (Stripe, etc.)

## Quick Start

### Installation

```bash
pnpm add cfg-kit
# Optional: Add plugins
pnpm add cfg-kit-stripe
```

### Basic Usage

```typescript
import { configBuilder } from "cfg-kit";
import { z } from "zod";

export default configBuilder
  .buildEnv({
    server: {
      DATABASE_URL: z.string().url(),
      API_KEY: z.string().min(1),
    },
    client: {
      PUBLIC_APP_URL: z.string().url(),
    },
    clientPrefix: "PUBLIC_",
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
  })
  .defineConfig(({ serverField, clientField }) => ({
    server: {
      dbUrl: serverField(z.string().url(), process.env.DATABASE_URL!),
      apiKey: serverField(z.string(), process.env.API_KEY!),
    },
    client: {
      appVersion: clientField(z.string(), "1.0.0"),
      buildNumber: clientField(z.number(), 123),
    }
  }));
```

**Somewhere else in the app:**

```typescript
// Server-side code
import { dbUrl, apiKey } from './config.server';

console.log(dbUrl); // Fully typed and validated URL
console.log(apiKey); // Fully typed and validated string

// Client-side code  
import { appVersion, buildNumber } from './config.client';

console.log(appVersion); // "1.0.0"
console.log(buildNumber); // 123
```

### With Plugins

```typescript
import { configBuilder } from "cfg-kit";
import { StripePlugin, defineStripeProduct } from "cfg-kit-stripe";

export default configBuilder
  .addPlugins([
    new StripePlugin({
      products: [
        defineStripeProduct({
          stableId: 'starterPlan',
          name: 'Starter Plan',
          default_price_data: {
            currency: 'usd',
            unit_amount: 999,
            recurring: { interval: 'month' },
          },
        }),
      ],
    }, {
      apiKey: process.env.STRIPE_SECRET_KEY!,
    })
  ])
  .buildEnv({
    server: {
      STRIPE_SECRET_KEY: z.string().min(1),
    },
    client: {
      PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
    },
    clientPrefix: "PUBLIC_",
    runtimeEnv: process.env,
  })
  .defineConfig(({ serverField, clientField }) => ({
     server: {
       stripeApiKey: serverField(z.string(), process.env.STRIPE_SECRET_KEY!),
     },
     client: {
       stripePublishableKey: clientField(z.string(), process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY!),
     }
   }));
```

**Somewhere else in the app:**

```typescript
// Server-side code
import { stripeApiKey } from './config.server';

const stripe = new Stripe(stripeApiKey);

// Client-side code
import { starterPlan } from './config.client';

// use starterPlan (its a string containing the id)
```

### Async Configuration

```typescript
const getAsyncValue = async (stableId: string) => {
  // Fetch from database, API, etc.
  return "computed-value";
};

export default configBuilder
  .buildEnv({...})
  .defineConfig(({ serverField, clientField }) => ({
    server: {
      computedValue: serverField(
        z.string(),
        async ({ stableId, env }) => {
          return getAsyncValue(stableId);
        }
      ),
    },
  }));
```

**Somewhere else in the app:**

```typescript
// Server-side code
import { computedValue } from './config.server';

console.log(computedValue); // "computed-value" (result of async function)
```

## CLI Commands

### Build Configuration

```bash
# Build separate server and client config files
cfg-kit build

# Build from specific file
cfg-kit build my-config.ts

# Custom output directory
cfg-kit build --output ./dist
```

Generates:
- `config.server.js` - Server-side configuration
- `config.client.js` - Client-side configuration

### Development Mode

```bash
# Watch for changes and rebuild
cfg-kit dev

# Watch specific file
cfg-kit dev my-config.ts
```

### Package Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "config:build": "cfg-kit build",
    "config:dev": "cfg-kit dev"
  }
}
```

## Usage in Applications

```javascript
// Server code
const serverConfig = require('./config.server.js');
console.log(serverConfig.DATABASE_URL);

// Client code
const clientConfig = require('./config.client.js');
console.log(clientConfig.PUBLIC_APP_URL);
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development
pnpm dev

# Work on specific package
pnpm --filter cfg-kit dev
```

## Packages

- `packages/cfg-kit/` - Main library
- `packages/cfg-kit-stripe/` - Stripe plugin
- `examples/basic-example/` - Usage examples

## License

MIT 