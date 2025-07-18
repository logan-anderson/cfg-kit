import { Stripe } from 'stripe'
import { z } from 'zod'
import { Plugin, pluginBuilder, ConfigField } from 'cfg-kit'
import {
    StripeProductSchema,
    StripePriceSchema,
    StripeCouponSchema,
    StripeConfigSchema,
    StripeProduct,
    StripePrice,
    StripeCoupon,
    StripeConfig,
} from './schemas'

function toValidJsVarName(str: string) {
    // 1. Remove leading characters that are not letters, underscore, or dollar sign.
    //    This ensures the name starts with a valid character.
    let sanitized = str.replace(/^[^a-zA-Z_$]+/, '');

    // 2. Replace any remaining invalid characters (not alphanumeric, underscore, or dollar sign) with an empty string.
    sanitized = sanitized.replace(/[^a-zA-Z0-9_$]/g, '');

    // 3. Ensure the name is not a JavaScript reserved keyword.
    //    If it is, you might prepend an underscore or similar to avoid conflict.
    //    This example includes a basic check for common keywords, but a comprehensive list is extensive.
    const reservedKeywords = [
        'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
        'delete', 'do', 'else', 'export', 'extends', 'false', 'finally', 'for', 'function',
        'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch',
        'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
        'enum', 'implements', 'interface', 'let', 'package', 'private', 'protected',
        'public', 'static', 'interface', 'await', 'abstract', 'boolean', 'byte', 'char',
        'double', 'final', 'float', 'goto', 'int', 'long', 'native', 'short', 'synchronized',
        'throws', 'transient', 'volatile'
    ];
    if (reservedKeywords.includes(sanitized)) {
        sanitized = '_' + sanitized;
    }

    // 4. Handle empty strings after sanitization (e.g., if the original string was all invalid characters).
    //    In such cases, you might return a default name or throw an error.
    if (sanitized === '') {
        return 'defaultVarName'; // Or handle as an error
    }

    return sanitized;
}

// Plugin interface
export interface StripePluginOptions {
    stripe?: Stripe
    apiKey: string
    apiVersion?: string
}
type StripePluginConfig = z.infer<typeof StripeConfigSchema>

// Re-export schemas and types for convenience
export {
    StripeProductSchema,
    StripePriceSchema,
    StripeCouponSchema,
    StripeConfigSchema,
    StripeProduct,
    StripePrice,
    StripeCoupon,
    StripeConfig,
}

// Main plugin class
export class StripePlugin extends Plugin {
    private stripe: Stripe
    private config: StripePluginConfig

    constructor(config: StripePluginConfig, options: StripePluginOptions) {
        super()
        this.config = config
        // Stripe will be injected as peer dependency
        this.stripe = options.stripe ?? new Stripe(options.apiKey, {
            // @ts-ignore
            apiVersion: options.apiVersion ?? '2025-02-24.acacia',
        })
    }

    async build() {
        return pluginBuilder.buildEnv({
            server: {
                STRIPE_SECRET_KEY: z.string().min(1),
                STRIPE_API_VERSION: z.string().optional(),
            },
            client: {},
            clientPrefix: '',
            runtimeEnv: {},
            emptyStringAsUndefined: true,
        }).defineConfig(({ serverField }) => {
            let productsAsFields: Record<string, ConfigField<{ stableId: string; name: string; priceId: string; productId: string; description?: string | undefined; active?: boolean | undefined; metadata?: Record<string, string> | undefined; }, { STRIPE_SECRET_KEY: string; STRIPE_API_VERSION?: string | undefined; }>> = {}
            for (const product of this.config.products) {
                productsAsFields[toValidJsVarName(product.stableId)] = serverField(z.object({
                    stableId: z.string(),
                    name: z.string(),
                    description: z.string().optional(),
                    active: z.boolean().default(true),
                    metadata: z.record(z.string()).default({}),
                    priceId: z.string(),
                    productId: z.string(),
                }), async ({ stableId }) => {
                    const stripeProduct = await this.stripe.products.search({
                        query: `metadata['stableId']:"${stableId}"`,
                    })
                    if (stripeProduct.data.length > 0) {
                        const realStripeProduct = stripeProduct.data[0]
                        // any values different?
                        if (realStripeProduct.name !== product.name || realStripeProduct.description !== product.description || realStripeProduct.active !== product.active || realStripeProduct.metadata !== product.metadata) {
                            await this.stripe.products.update(realStripeProduct.id, {
                                name: product.name,
                                description: product.description,
                                active: product.active,
                                metadata: {
                                    ...product.metadata,
                                    stableId: stableId,
                                },
                            })
                        }
                        if (!realStripeProduct.default_price) {
                            const newPrice = await this.stripe.prices.create({
                                product: realStripeProduct.id,
                                unit_amount: product.default_price_data?.unit_amount,
                                currency: product.default_price_data?.currency || 'usd',
                                recurring: product.default_price_data?.recurring,
                            })
                            await this.stripe.products.update(realStripeProduct.id, {
                                default_price: newPrice.id,
                            })
                            realStripeProduct.default_price = newPrice.id
                        }
                        return {
                            stableId,
                            name: realStripeProduct.name,
                            description: realStripeProduct.description || undefined,
                            active: realStripeProduct.active,
                            metadata: realStripeProduct.metadata as Record<string, string> || {},
                            priceId: realStripeProduct.default_price as string,
                            productId: realStripeProduct.id,
                        }
                    }
                    // we don't have a product, so we need to create it
                    const createdProduct = await this.stripe.products.create({
                        name: product.name,
                        description: product.description,
                        active: product.active,
                        default_price_data: product.default_price_data,
                        metadata: {
                            ...product.metadata,
                            stableId: stableId,
                        },
                    })
                    return {
                        stableId,
                        name: createdProduct.name,
                        description: createdProduct.description || undefined,
                        active: createdProduct.active,
                        metadata: createdProduct.metadata || {},
                        priceId: createdProduct.default_price as string,
                        productId: createdProduct.id,
                    }
                })
            }
            let pricesAsFields: Record<string, ConfigField<string, { STRIPE_SECRET_KEY: string; STRIPE_API_VERSION?: string | undefined; }>> = {}
            for (const price of this.config.prices) {
                pricesAsFields[toValidJsVarName(price.stableId)] = serverField(z.string(), async ({ env }) => {
                    const stripePrice = await this.stripe.prices.search({
                        query: `metadata['stableId']:"${price.stableId}"`,
                    })
                    if (stripePrice.data.length > 0) {
                        const realStripePrice = stripePrice.data[0]
                        // See if any values are different
                        if (realStripePrice.unit_amount !== price.unit_amount || realStripePrice.unit_amount_decimal !== price.unit_amount_decimal) {
                            return realStripePrice.id
                        }
                        return realStripePrice.id
                    }
                    // create the price
                    const createdPrice = await this.stripe.prices.create({
                        product: price.product,
                        currency: price.currency,
                        unit_amount: price.unit_amount,
                        unit_amount_decimal: price.unit_amount_decimal,
                        metadata: {
                            ...price.metadata,
                            stableId: price.stableId,
                        },
                    })
                    return createdPrice.id
                })
            }
            let couponsAsFields: Record<string, ConfigField<string, { STRIPE_SECRET_KEY: string; STRIPE_API_VERSION?: string | undefined; }>> = {}
            for (const coupon of this.config.coupons) {
                couponsAsFields[toValidJsVarName(coupon.stableId)] = serverField(z.string(), async ({ env }) => {
                    // need to use a try catch here becausae the stripe api will throw an error if the coupon doesn't exist
                    try {
                        const stripeCoupon = await this.stripe.coupons.retrieve(coupon.id)
                        if (stripeCoupon) {
                            const realStripeCoupon = stripeCoupon
                            if (realStripeCoupon.percent_off !== coupon.percent_off || realStripeCoupon.amount_off !== coupon.amount_off || realStripeCoupon.currency !== coupon.currency || realStripeCoupon.duration !== coupon.duration || realStripeCoupon.duration_in_months !== coupon.duration_in_months || realStripeCoupon.max_redemptions !== coupon.max_redemptions || realStripeCoupon.metadata !== coupon.metadata) {
                                return realStripeCoupon.id
                            }
                            return realStripeCoupon.id
                        }
                    } catch (error: any) {
                        // This is the only error code that we want to handle
                        if (error.code !== 'resource_missing') {
                            throw error
                        }
                    }

                    // create the coupon
                    const createdCoupon = await this.stripe.coupons.create({
                        id: coupon.id,
                        percent_off: coupon.percent_off,
                        amount_off: coupon.amount_off,
                        currency: coupon.currency,
                        duration: coupon.duration,
                        duration_in_months: coupon.duration_in_months,
                        max_redemptions: coupon.max_redemptions,
                    })
                    return createdCoupon.id
                })
            }

            return {
                server: {
                    ...productsAsFields,
                    ...pricesAsFields,
                    ...couponsAsFields,
                },
            }
        })
    }
}

// Helper functions for defining resources
export function defineStripeProduct(product: StripeProduct): StripeProduct {
    return StripeProductSchema.parse(product)
}

export function defineStripePrice(price: StripePrice): StripePrice {
    return StripePriceSchema.parse(price)
}

export function defineStripeCoupon(coupon: StripeCoupon): StripeCoupon {
    return StripeCouponSchema.parse(coupon)
}


export function defineStripeConfig(config: StripeConfig): StripeConfig {
    return StripeConfigSchema.parse(config)
}

// Default export
export default StripePlugin 