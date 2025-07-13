import { configBuilder, Plugin, pluginBuilder } from "config-as-code";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const getStripeProductId = async (stableId: string) => {
    // wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    return 'example-product-id'
}

// Example StripePlugin implementation
class StripePlugin extends Plugin {
    async build() {
        return pluginBuilder.buildEnv({
            server: {
                STRIPE_SECRET_KEY: z.string().min(1),
                STRIPE_WEBHOOK_SECRET: z.string().min(1),
            },
            client: {
                PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
            },
            clientPrefix: "PUBLIC_",
            runtimeEnv: process.env,
            emptyStringAsUndefined: true,
        }).defineConfig(({ serverField, clientField }) => ({
            server: {
                stripeConfig: serverField(
                    z.object({
                        secretKey: z.string(),
                        webhookSecret: z.string(),
                    }),
                    ({ stableId, env }) => ({
                        secretKey: env.STRIPE_SECRET_KEY,
                        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
                    })
                )
            },
            client: {
                stripePublishableKey: clientField(
                    z.string(),
                    ({ stableId, env }) => env.PUBLIC_STRIPE_PUBLISHABLE_KEY
                )
            }
        }));
    }
}

export default configBuilder.addPlugins([
    new StripePlugin(),
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
        stripeProductId: serverField(
            z.string().min(1),
            async ({ stableId, env }) => {
                return getStripeProductId(stableId)
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

