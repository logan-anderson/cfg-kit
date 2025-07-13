# cfg-kit-stripe

A Stripe plugin for cfg-kit that allows you to define Stripe products, subscriptions, billing meters, and other payment resources as configuration.

## Installation

```bash
npm install cfg-kit-stripe stripe
# or
pnpm add cfg-kit-stripe stripe
```

Note: `stripe` is a peer dependency and must be installed separately.

## Usage

### Basic Setup

```typescript
import { StripePlugin, defineStripeConfig } from 'cfg-kit-stripe'

const stripePlugin = new StripePlugin({
  apiKey: process.env.STRIPE_SECRET_KEY!,
  apiVersion: '2024-12-18.acacia', // optional
})

// Define your Stripe configuration
const stripeConfig = defineStripeConfig({
  products: [
    {
      name: 'Pro Plan',
      description: 'Professional subscription plan',
      default_price_data: {
        currency: 'usd',
        unit_amount: 2999, // $29.99
        recurring: {
          interval: 'month',
        },
      },
      metadata: {
        plan_type: 'pro',
      },
    },
  ],
  coupons: [
    {
      id: 'WELCOME20',
      percent_off: 20,
      duration: 'once',
      name: 'Welcome 20% off',
    },
  ],
  billing_meters: [
    {
      display_name: 'API Calls',
      event_name: 'api_call',
      customer_mapping: {
        event_payload_key: 'customer_id',
        type: 'by_id',
      },
      default_aggregation: {
        formula: 'count',
      },
    },
  ],
})

// Sync to Stripe
await stripePlugin.syncConfig(stripeConfig)
```

### Defining Products

```typescript
import { defineStripeProduct } from 'cfg-kit-stripe'

const product = defineStripeProduct({
  name: 'Starter Plan',
  description: 'Basic subscription plan',
  active: true,
  metadata: {
    plan_type: 'starter',
    features: 'basic',
  },
  default_price_data: {
    currency: 'usd',
    unit_amount: 999, // $9.99
    recurring: {
      interval: 'month',
    },
  },
})
```

### Defining Prices

```typescript
import { defineStripePrice } from 'cfg-kit-stripe'

const price = defineStripePrice({
  product: 'prod_ABC123', // Product ID
  currency: 'usd',
  unit_amount: 1999, // $19.99
  recurring: {
    interval: 'month',
    interval_count: 1,
    usage_type: 'licensed',
  },
  nickname: 'Monthly Pro',
  metadata: {
    plan: 'pro_monthly',
  },
})
```

### Defining Coupons

```typescript
import { defineStripeCoupon } from 'cfg-kit-stripe'

const coupon = defineStripeCoupon({
  id: 'SUMMER50',
  percent_off: 50,
  duration: 'repeating',
  duration_in_months: 3,
  max_redemptions: 100,
  name: 'Summer Sale 50% off',
  metadata: {
    campaign: 'summer_2024',
  },
})
```

### Defining Billing Meters

```typescript
import { defineStripeBillingMeter } from 'cfg-kit-stripe'

const meter = defineStripeBillingMeter({
  display_name: 'Storage Usage',
  event_name: 'storage_used',
  customer_mapping: {
    event_payload_key: 'customer_id',
    type: 'by_id',
  },
  default_aggregation: {
    formula: 'sum',
  },
  value_settings: {
    event_payload_key: 'bytes_used',
  },
})
```

## API Reference

### StripePlugin

The main plugin class for syncing configurations to Stripe.

#### Constructor

```typescript
new StripePlugin(config: StripePluginConfig)
```

- `config.apiKey`: Your Stripe secret key
- `config.webhookSecret`: Optional webhook secret for validation
- `config.apiVersion`: Optional Stripe API version (defaults to '2024-12-18.acacia')

#### Methods

- `syncConfig(config: StripeConfig)`: Sync entire configuration to Stripe
- `syncProducts(products: StripeProduct[])`: Sync only products
- `syncPrices(prices: StripePrice[])`: Sync only prices
- `syncCoupons(coupons: StripeCoupon[])`: Sync only coupons
- `syncBillingMeters(meters: StripeBillingMeter[])`: Sync only billing meters

### Helper Functions

- `defineStripeProduct(product)`: Validate and return a Stripe product configuration
- `defineStripePrice(price)`: Validate and return a Stripe price configuration
- `defineStripeCoupon(coupon)`: Validate and return a Stripe coupon configuration
- `defineStripeBillingMeter(meter)`: Validate and return a Stripe billing meter configuration
- `defineStripeConfig(config)`: Validate and return a complete Stripe configuration

## Type Safety

All functions provide full TypeScript type safety and validation using Zod schemas. Invalid configurations will throw validation errors at runtime.

## Integration with cfg-kit

This plugin is designed to work seamlessly with the cfg-kit ecosystem. You can combine it with other cfg-kit plugins and use the cfg-kit CLI for development and building.

## License

ISC 