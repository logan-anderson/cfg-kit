# Basic Example - cfg-kit with Stripe & PostHog Plugins

This example demonstrates how to use `cfg-kit` with the `cfg-kit-stripe` and `cfg-kit-posthog` plugins to define and manage application configuration, Stripe payment resources, and PostHog feature flags.

## What's Included

### 1. Basic cfg-kit Configuration (`config.ts`)
- Environment variable validation with Zod
- Custom plugin system demonstration
- Server and client configuration separation
- Async configuration with stable IDs

### 2. Stripe Plugin Configuration
- **Products**: 3 subscription plans (Starter, Pro, Enterprise)
- **Coupons**: 3 discount types (percentage, flat amount, repeating)
- Type-safe configuration with automatic validation

### 3. PostHog Plugin Configuration
- **Feature Flags**: 4 example feature flags with different targeting rules
  - `new-dashboard`: Enabled for all users (100% rollout)
  - `beta-features`: Enabled for company email users (50% rollout)
  - `premium-features`: Enabled for premium subscription users (100% rollout)
  - `maintenance-mode`: Disabled maintenance banner flag
- Advanced targeting with user properties and rollout percentages
- Type-safe configuration with automatic validation

### 4. Demo Application (`app.ts`)
- Shows both configuration systems working together
- Displays all defined Stripe resources
- Optionally syncs to Stripe API (with valid credentials)

## Running the Example

### Prerequisites
1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables (copy and modify `.env.example`):
   ```bash
   # Required
   DATABASE_URL=postgresql://username:password@localhost:5432/database
   OPEN_AI_API_KEY=sk-your-openai-api-key-here
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-key-here
   
   # Optional (for Stripe features)
   STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key-here
   STRIPE_API_VERSION=2025-02-24.acacia
   
   # Optional (for PostHog features)
   POSTHOG_API_KEY=phc_your-posthog-api-key-here
   POSTHOG_PROJECT_ID=12345
   POSTHOG_HOST=https://app.posthog.com
   ```

### Available Scripts

```bash
# Run the complete example (recommended)
pnpm app

# Run only the basic config
pnpm dev

# Test Stripe configuration only
pnpm stripe

# Build the project
pnpm build

# Use cfg-kit CLI
pnpm config:build
pnpm config:dev
```

## Example Output

When you run `pnpm app`, you'll see:

```
🚀 Testing config with plugins...

✅ Configuration loaded successfully!

📊 Server Configuration:
- Database URL: ✓ Present
- OpenAI API Key: ✓ Present
- Stripe Starter Plan: example-product-id
- PostHog New Dashboard Flag: example-flag-id
- PostHog Beta Features Flag: example-flag-id

📱 Client Configuration:
- Clerk Publishable Key: ✓ Present
- App Version: 1.0.0
- Build Number: 123

💳 Stripe Configuration (cfg-kit-stripe):
Products defined: 3
Coupons defined: 3

🎛️ PostHog Configuration (cfg-kit-posthog):
Feature flags defined: 4

📦 Product examples:
1. Starter Plan - Perfect for individuals getting started
   Price: $9.99/month
2. Pro Plan - For growing teams and businesses
   Price: $29.99/month
3. Enterprise Plan - For large organizations with custom needs

🎫 Coupon examples:
1. WELCOME20 - 20% off (once)
2. SUMMER50 - 50% off (repeating)
3. FLAT10 - $10 off (forever)

🎛️ Feature flag examples:
1. new-dashboard - New Dashboard (100% rollout, active)
2. beta-features - Beta Features (50% rollout for @company.com, active)
3. premium-features - Premium Features (100% rollout for premium users, active)
4. maintenance-mode - Maintenance Mode (inactive)
```

## Key Features Demonstrated

### Type Safety
- All configuration is fully typed with TypeScript
- Zod validation ensures runtime type safety
- Auto-completion and error checking in your IDE

### Stripe Integration
- Define products, prices, and coupons as code
- Automatic synchronization to Stripe API
- Validation of Stripe resource schemas
- Support for all major Stripe payment features

### PostHog Integration
- Define feature flags with advanced targeting rules
- Automatic creation of feature flags in PostHog
- Support for rollout percentages and user properties
- Only creates flags that don't already exist (idempotent)

### Plugin Architecture
- Custom plugins can extend cfg-kit functionality
- Clean separation between different configuration domains
- Composable and reusable configuration patterns

## Plugin Synchronization

### Stripe Sync
If you provide a valid `STRIPE_SECRET_KEY`, the example will attempt to sync the configuration to your Stripe account. This will:

1. Create or update products in Stripe
2. Create coupons (if they don't exist)
3. Show success/failure messages

### PostHog Sync
If you provide valid PostHog credentials (`POSTHOG_API_KEY` and `POSTHOG_PROJECT_ID`), the example will:

1. Check for existing feature flags in PostHog
2. Create new feature flags that don't already exist
3. Skip flags that already exist (no updates)
4. Show success/failure messages

**Note**: Both sync operations are idempotent - running them multiple times is safe.

## Next Steps

- Modify the configuration to match your actual products and feature flags
- Add more complex pricing strategies and feature flag targeting
- Integrate with your application's user management
- Set up webhooks for real-time Stripe events
- Use PostHog's analytics and experimentation features
- Use the cfg-kit CLI for automated deployments 