import { configBuilder } from "cfg-kit";
import { defineStripeCoupon, defineStripeProduct, StripePlugin } from "cfg-kit-stripe";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Example Stripe configuration using cfg-kit-stripe
export const stripeConfig = {
    products: [
        defineStripeProduct({
            stableId: 'starter-plan',
            name: 'Starter Plan',
            description: 'Perfect for individuals getting started',
            active: true,
            metadata: {
                plan_type: 'starter',
                features: 'basic',
                max_users: '1'
            },
            default_price_data: {
                currency: 'usd',
                unit_amount: 999, // $9.99
                recurring: {
                    interval: 'month',
                },
            },
        }),
        defineStripeProduct({
            stableId: 'pro-plan',
            name: 'Pro Plan',
            description: 'For growing teams and businesses',
            active: true,
            metadata: {
                plan_type: 'pro',
                features: 'advanced',
                max_users: '10'
            },
            default_price_data: {
                currency: 'usd',
                unit_amount: 2999, // $29.99
                recurring: {
                    interval: 'month',
                },
            },
        }),
        defineStripeProduct({
            stableId: 'enterprise-plan',
            name: 'Enterprise Plan',
            description: 'For large organizations with custom needs',
            active: true,
            metadata: {
                plan_type: 'enterprise',
                features: 'premium',
                max_users: 'unlimited'
            },
            // No default price - we'll create separate prices
        }),
    ],

    prices: [],

    coupons: [
        defineStripeCoupon({
            stableId: 'welcome-20',
            id: 'WELCOME20',
            percent_off: 20,
            duration: 'once',
            name: 'Welcome 20% off',
            metadata: {
                campaign: 'onboarding',
            },
        }),
        defineStripeCoupon({
            stableId: 'summer-50',
            id: 'SUMMER50',
            percent_off: 50,
            duration: 'repeating',
            duration_in_months: 3,
            max_redemptions: 100,
            name: 'Summer Sale 50% off',
            metadata: {
                campaign: 'summer_2024',
            },
        }),
        defineStripeCoupon({
            stableId: 'flat-10',
            id: 'FLAT10',
            amount_off: 1000, // $10.00 off
            currency: 'usd',
            duration: 'forever',
            name: '$10 off forever',
            metadata: {
                campaign: 'loyalty',
            },
        }),
    ],


} as const

const getSomeAsyncValue = async (stableId: string) => {
    // wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    return 'example-product-id'
}

export default configBuilder.addPlugins([
    new StripePlugin({
        products: [...stripeConfig.products],
        prices: [...stripeConfig.prices],
        coupons: [...stripeConfig.coupons],
    }, {
        apiKey: process.env.STRIPE_SECRET_KEY ?? '',
    })
]).buildEnv({
    server: {
        DATABASE_URL: z.string().url(),
        OPEN_AI_API_KEY: z.string().min(1),
    },
    client: {
        PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    },
    clientPrefix: "PUBLIC_",
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
}).defineConfig(({ serverField, clientField }) => ({
    server: {
        someOtherServerConfig: serverField(
            z.string().min(1),
            "asdf"
        ),
        someAsyncpleValueExample: serverField(
            z.string().min(1),
            async ({ stableId, env }) => {
                return getSomeAsyncValue(stableId)
            }
        )
    },
    client: {
        appVersion: clientField(
            z.string().min(1),
            "1.0.0"
        ),
        buildNumber: clientField(
            z.number().int().positive(),
            async ({ stableId, env }) => {
                return 123
            }
        )
    }
}))

