import { z } from 'zod'

// Stripe resource schemas
export const StripeProductSchema = z.object({
    stableId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    active: z.boolean().default(true),
    metadata: z.record(z.string()).default({}),
    url: z.string().optional(),
    images: z.array(z.string()).optional(),
    default_price_data: z.object({
        currency: z.string(),
        unit_amount: z.number().optional(),
        recurring: z.object({
            interval: z.enum(['day', 'week', 'month', 'year']),
            interval_count: z.number().optional(),
        }).optional(),
    }).optional(),
})

export const StripePriceSchema = z.object({
    stableId: z.string(),
    product: z.string(), // Product ID
    currency: z.string(),
    unit_amount: z.number().optional(),
    unit_amount_decimal: z.string().optional(),
    active: z.boolean().default(true),
    nickname: z.string().optional(),
    recurring: z.object({
        interval: z.enum(['day', 'week', 'month', 'year']),
        interval_count: z.number().optional(),
        usage_type: z.enum(['licensed', 'metered']).optional(),
    }).optional(),
    metadata: z.record(z.string()).default({}),
})

export const StripeCouponSchema = z.object({
    // id that will be used in the config
    stableId: z.string(),
    // id that will be used in the stripe api
    id: z.string(),
    percent_off: z.number().optional(),
    amount_off: z.number().optional(),
    currency: z.string().optional(),
    duration: z.enum(['forever', 'once', 'repeating']),
    duration_in_months: z.number().optional(),
    max_redemptions: z.number().optional(),
    name: z.string().optional(),
    metadata: z.record(z.string()).default({}),
})


export const StripeConfigSchema = z.object({
    products: z.array(StripeProductSchema).optional().default([]),
    prices: z.array(StripePriceSchema).optional().default([]),
    coupons: z.array(StripeCouponSchema).optional().default([]),
})

// Types
export type StripeProduct = z.infer<typeof StripeProductSchema>
export type StripePrice = z.infer<typeof StripePriceSchema>
export type StripeCoupon = z.infer<typeof StripeCouponSchema>
export type StripeConfig = z.infer<typeof StripeConfigSchema> 