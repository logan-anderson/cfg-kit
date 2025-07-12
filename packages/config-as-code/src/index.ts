import { z } from 'zod';

export type EnvConfig<
    TClientPrefix extends string,
    TServer extends Record<string, z.ZodType>,
    TClient extends Record<string, z.ZodType>
> = {
    env: {
        server: TServer;
        client: TClient;
        clientPrefix: TClientPrefix;
        runtimeEnv: Record<string, string | undefined>;
        emptyStringAsUndefined?: boolean;
    };
};

export type InferEnvConfig<
    TClientPrefix extends string,
    TServer extends Record<string, z.ZodType>,
    TClient extends Record<string, z.ZodType>
> = z.infer<z.ZodObject<TServer>> & z.infer<z.ZodObject<TClient>>;

// Helper type to enforce client prefix
export type EnforceClientPrefix<
    TClientPrefix extends string,
    TClient extends Record<string, z.ZodType>
> = {
        [K in keyof TClient]: K extends `${TClientPrefix}${string}` ? TClient[K] : never;
    };

export function defineConfig<
    TClientPrefix extends string,
    TServer extends Record<string, z.ZodType>,
    TClient extends Record<string, z.ZodType>
>(
    config: EnvConfig<TClientPrefix, TServer, TClient> & {
        env: {
            client: EnforceClientPrefix<TClientPrefix, TClient>;
        };
    }
): InferEnvConfig<TClientPrefix, TServer, TClient> {
    const { env } = config;
    const { server, client, clientPrefix, runtimeEnv, emptyStringAsUndefined = false } = env;

    // Validate that all client variables have the correct prefix
    for (const key of Object.keys(client)) {
        if (!key.startsWith(clientPrefix)) {
            throw new Error(
                `Client environment variable "${key}" does not start with the required prefix "${clientPrefix}"`
            );
        }
    }

    // Helper function to process environment values
    const processEnvValue = (value: string | undefined): string | undefined => {
        if (emptyStringAsUndefined && value === '') {
            return undefined;
        }
        return value;
    };

    // Create processed runtime environment
    const processedRuntimeEnv = Object.fromEntries(
        Object.entries(runtimeEnv).map(([key, value]) => [key, processEnvValue(value)])
    );

    // Validate server environment variables
    const serverSchema = z.object(server);
    const serverEnvKeys = Object.keys(server);
    const serverEnvValues = Object.fromEntries(
        serverEnvKeys.map(key => [key, processedRuntimeEnv[key]])
    );

    // Validate client environment variables
    const clientSchema = z.object(client);
    const clientEnvKeys = Object.keys(client);
    const clientEnvValues = Object.fromEntries(
        clientEnvKeys.map(key => [key, processedRuntimeEnv[key]])
    );

    try {
        const validatedServer = serverSchema.parse(serverEnvValues);
        const validatedClient = clientSchema.parse(clientEnvValues);

        return {
            ...validatedServer,
            ...validatedClient,
        } as InferEnvConfig<TClientPrefix, TServer, TClient>;
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map(err => {
                const path = err.path.join('.');
                return `${path}: ${err.message}`;
            });

            throw new Error(
                `Environment validation failed:\n${errorMessages.join('\n')}`
            );
        }
        throw error;
    }
}
