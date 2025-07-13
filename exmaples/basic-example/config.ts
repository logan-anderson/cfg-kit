import { configBuilder } from "config-as-code";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const getStripeProductId = async (stableId: string) => {
    // wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    return 'example-product-id'
}

export default configBuilder.buildEnv({
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

