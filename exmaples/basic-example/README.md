# Basic Example - cfg-kit with Stripe Plugin

This example demonstrates how to use `cfg-kit` with the `cfg-kit-stripe` plugin to define and manage both application configuration and Stripe payment resources.

## What's Included

### 1. Basic cfg-kit Configuration (`config.ts`)
- Environment variable validation with Zod
- Custom plugin system demonstration
- Server and client configuration separation
- Async configuration with stable IDs

### 2. Stripe Plugin Configuration (`stripe-config.ts`)
- **Products**: 3 subscription plans (Starter, Pro, Enterprise)
- **Coupons**: 3 discount types (percentage, flat amount, repeating)
- **Billing Meters**: 3 usage tracking meters (API calls, storage, users)
- Type-safe configuration with automatic validation

### 3. Demo Application (`app.ts`)
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
   STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here
   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key-here
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
- Stripe Product ID: example-product-id

📱 Client Configuration:
- Clerk Publishable Key: ✓ Present
- App Version: 1.0.0
- Build Number: 123

💳 Stripe Configuration (cfg-kit-stripe):
Products defined: 3
Coupons defined: 3
Billing meters defined: 3

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

📊 Billing meter examples:
1. API Calls - tracking "api_call" events
2. Storage Usage - tracking "storage_used" events
3. Active Users - tracking "user_active" events
```

## Key Features Demonstrated

### Type Safety
- All configuration is fully typed with TypeScript
- Zod validation ensures runtime type safety
- Auto-completion and error checking in your IDE

### Stripe Integration
- Define products, prices, coupons, and billing meters as code
- Automatic synchronization to Stripe API
- Validation of Stripe resource schemas
- Support for all major Stripe payment features

### Plugin Architecture
- Custom plugins can extend cfg-kit functionality
- Clean separation between different configuration domains
- Composable and reusable configuration patterns

## Stripe Sync

If you provide a valid `STRIPE_SECRET_KEY`, the example will attempt to sync the configuration to your Stripe account. This will:

1. Create or update products in Stripe
2. Create coupons (if they don't exist)
3. Create billing meters for usage tracking
4. Show success/failure messages

**Note**: The sync operation is idempotent - running it multiple times is safe.

## Next Steps

- Modify `stripe-config.ts` to match your actual products
- Add more complex pricing strategies
- Integrate with your application's user management
- Set up webhooks for real-time Stripe events
- Use the cfg-kit CLI for automated deployments 