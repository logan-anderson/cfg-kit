# cfg-kit-posthog

A PostHog plugin for [cfg-kit](https://github.com/config-as-code/cfg-kit) that allows you to define PostHog feature flags as configuration.

## Features

- ✅ **Feature Flag Management**: Define PostHog feature flags in your configuration
- ✅ **Idempotent Operations**: Only creates feature flags if they don't already exist
- ✅ **Type Safety**: Full TypeScript support with Zod validation
- ✅ **Environment Variables**: Automatic environment variable generation

## Installation

```bash
npm install cfg-kit-posthog posthog-node cfg-kit
# or
pnpm add cfg-kit-posthog posthog-node cfg-kit
# or
yarn add cfg-kit-posthog posthog-node cfg-kit
```

## Usage

### Basic Setup

```typescript
import { definePostHogConfig, PostHogPlugin } from 'cfg-kit-posthog'

const config = definePostHogConfig({
  featureFlags: [
    {
      key: 'new-dashboard',
      name: 'New Dashboard',
      description: 'Enable the new dashboard design',
      active: true,
      filters: {
        groups: [
          {
            properties: [],
            rollout_percentage: 100
          }
        ]
      },
      tags: ['ui', 'dashboard']
    }
  ]
})

const plugin = new PostHogPlugin(config, {
  apiKey: process.env.POSTHOG_API_KEY!,
  projectId: process.env.POSTHOG_PROJECT_ID!,
  host: 'https://app.posthog.com' // optional, defaults to app.posthog.com
})
```

### With cfg-kit

```typescript
import { defineConfig } from 'cfg-kit'
import { PostHogPlugin, definePostHogConfig } from 'cfg-kit-posthog'

export default defineConfig({
  plugins: [
    new PostHogPlugin(
      definePostHogConfig({
        featureFlags: [
          {
            key: 'beta-features',
            name: 'Beta Features',
            description: 'Enable beta features for testing',
            active: true,
            filters: {
              groups: [
                {
                  properties: [
                    {
                      key: 'email',
                      operator: 'icontains',
                      value: '@company.com'
                    }
                  ],
                  rollout_percentage: 50
                }
              ]
            }
          }
        ]
      }),
      {
        apiKey: process.env.POSTHOG_API_KEY!,
        projectId: process.env.POSTHOG_PROJECT_ID!
      }
    )
  ]
})
```

## Configuration

### Environment Variables

The plugin requires the following environment variables:

- `POSTHOG_API_KEY`: Your PostHog API key
- `POSTHOG_PROJECT_ID`: Your PostHog project ID  
- `POSTHOG_HOST`: (optional) PostHog host URL, defaults to `https://app.posthog.com`

### Feature Flag Schema

```typescript
type PostHogFeatureFlag = {
  key: string                    // Unique identifier for the feature flag
  name: string                   // Display name
  description?: string           // Optional description
  active?: boolean              // Whether the flag is active (default: true)
  filters?: {                   // Targeting filters
    groups: Array<{
      properties: Array<{
        key: string
        operator?: 'exact' | 'is_not' | 'icontains' | 'not_icontains' | 'regex' | 'not_regex' | 'gt' | 'gte' | 'lt' | 'lte' | 'is_set' | 'is_not_set'
        value?: string | number | boolean | string[] | number[]
        type?: 'person' | 'event' | 'element' | 'static-cohort' | 'behavioral'
      }>
      rollout_percentage: number  // 0-100
      variant?: string
    }>
  }
  variants?: Array<{            // Optional feature flag variants
    key: string
    name?: string
    rollout_percentage: number
  }>
  tags?: string[]              // Optional tags for organization
}
```

## Behavior

### Feature Flag Creation

- **Create Only**: The plugin only creates feature flags that don't already exist in PostHog
- **No Updates**: If a feature flag with the same key already exists, it will NOT be updated
- **Dashboard Management**: Use the PostHog dashboard for updates and additional configuration

### Generated Environment Variables

For each feature flag, the plugin generates environment variables with the feature flag ID:

```typescript
// For a feature flag with key 'new-dashboard'
// Generates: NEW_DASHBOARD with the PostHog feature flag ID
```

## Error Handling

The plugin includes comprehensive error handling:

- API connection failures
- Invalid API keys or project IDs
- Feature flag creation errors
- Network timeouts

## Examples

### Simple Feature Flag

```typescript
definePostHogConfig({
  featureFlags: [
    {
      key: 'maintenance-mode',
      name: 'Maintenance Mode',
      description: 'Enable maintenance mode banner',
      active: false
    }
  ]
})
```

### Advanced Feature Flag with Targeting

```typescript
definePostHogConfig({
  featureFlags: [
    {
      key: 'premium-features',
      name: 'Premium Features',
      description: 'Enable premium features for paid users',
      active: true,
      filters: {
        groups: [
          {
            properties: [
              {
                key: 'subscription_tier',
                operator: 'exact',
                value: 'premium'
              }
            ],
            rollout_percentage: 100
          }
        ]
      },
      tags: ['premium', 'features']
    }
  ]
})
```

### Feature Flag with Variants

```typescript
definePostHogConfig({
  featureFlags: [
    {
      key: 'checkout-flow',
      name: 'Checkout Flow Test',
      description: 'A/B test different checkout flows',
      active: true,
      variants: [
        {
          key: 'control',
          name: 'Control (Original)',
          rollout_percentage: 50
        },
        {
          key: 'variant-a',
          name: 'Variant A (Simplified)',
          rollout_percentage: 50
        }
      ]
    }
  ]
})
```

## API Reference

### `PostHogPlugin`

Main plugin class for integrating with cfg-kit.

#### Constructor

```typescript
new PostHogPlugin(config: PostHogConfig, options: PostHogPluginOptions)
```

**Parameters:**
- `config`: PostHog configuration object
- `options`: Plugin options including API key and project ID

### `definePostHogConfig(config)`

Helper function to define and validate PostHog configuration.

### `definePostHogFeatureFlag(featureFlag)`

Helper function to define and validate a single feature flag.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 