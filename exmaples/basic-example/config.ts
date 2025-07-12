import { defineConfig } from "config-as-code";
import { z } from "zod";

export const env = defineConfig({
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
    }
});

// Example usage - this will show that the env object is properly typed
console.log("Database URL:", env.DATABASE_URL);
console.log("OpenAI API Key:", env.OPEN_AI_API_KEY);
console.log("Clerk Publishable Key:", env.PUBLIC_CLERK_PUBLISHABLE_KEY);
