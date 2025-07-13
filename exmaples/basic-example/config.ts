import { defineConfig } from "config-as-code";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const getStripeProductId = async (stableId: string) => {
    return 'example-product-id'
}

export default defineConfig({
    env: {
        server: {
            DATABASE_URL: z.string().url(),
            OPEN_AI_API_KEY: z.string().min(1),
        },

        /**
         * The prefix that client-side variables must have. This is enforced both at
         * a type-level and at runtime.
         */
        clientPrefix: "PUBLIC_",

        client: {
            PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
        },

        /**
         * What object holds the environment variables at runtime. This is usually
         * `process.env` or `import.meta.env`.
         */
        runtimeEnv: process.env,

        /**
         * By default, this library will feed the environment variables directly to
         * the Zod validator.
         *
         * This means that if you have an empty string for a value that is supposed
         * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
         * it as a type mismatch violation. Additionally, if you have an empty string
         * for a value that is supposed to be a string with a default value (e.g.
         * `DOMAIN=` in an ".env" file), the default value will never be applied.
         *
         * In order to solve these issues, we recommend that all new projects
         * explicitly specify this option as true.
         */
        emptyStringAsUndefined: true,
    },
    // New server API with validation and value functions
    server: {
        stripeProductId: {
            validation: z.string().min(1),
            value: async (stableId: string) => {
                return getStripeProductId(stableId)
            }
        }
    },
    // New client API with validation and value functions
    client: {
        appVersion: {
            validation: z.string().min(1),
            value: "1.0.0" // Can be a static value or a function
        },
        buildNumber: {
            validation: z.number().int().positive(),
            value: async (stableId: string) => {
                // This could fetch from CI/CD environment or package.json
                console.log(`Resolving ${stableId}`)
                return 123
            }
        }
    }
});

