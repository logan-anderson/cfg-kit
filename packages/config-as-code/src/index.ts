import { z } from 'zod';

// New API types
export type ConfigField<T = any> = {
    validation: z.ZodType<T>;
    value: T | ((stableId: string) => T | Promise<T>);
};

export type ServerConfig = Record<string, ConfigField>;
export type ClientConfig = Record<string, ConfigField>;

// Existing API types
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

// Combined config type
export type Config<
    TClientPrefix extends string = any,
    TServer extends Record<string, z.ZodType> = any,
    TClient extends Record<string, z.ZodType> = any,
    TServerConfig extends ServerConfig = any,
    TClientConfig extends ClientConfig = any
> = {
    server?: TServerConfig;
    client?: TClientConfig;
    env?: {
        server: TServer;
        client: TClient;
        clientPrefix: TClientPrefix;
        runtimeEnv: Record<string, string | undefined>;
        emptyStringAsUndefined?: boolean;
    };
};

// Infer resolved values from ConfigField
type InferConfigField<T extends ConfigField> = T['validation'] extends z.ZodType<infer U> ? U : never;

// Infer all fields from a config object
type InferConfigObject<T extends Record<string, ConfigField>> = {
    [K in keyof T]: InferConfigField<T[K]>;
};

export type InferConfig<T extends Config> = {
    server: T['server'] extends ServerConfig
    ? InferConfigObject<T['server']>
    : T['env'] extends { server: Record<string, z.ZodType> }
    ? z.infer<z.ZodObject<T['env']['server']>>
    : {};
    client: T['client'] extends ClientConfig
    ? InferConfigObject<T['client']>
    : T['env'] extends { client: Record<string, z.ZodType> }
    ? z.infer<z.ZodObject<T['env']['client']>>
    : {};
};

// Legacy type for backward compatibility
export type InferEnvConfig<
    TClientPrefix extends string,
    TServer extends Record<string, z.ZodType>,
    TClient extends Record<string, z.ZodType>
> = {
    server: z.infer<z.ZodObject<TServer>>;
    client: z.infer<z.ZodObject<TClient>>;
};

// Helper type to enforce client prefix
export type EnforceClientPrefix<
    TClientPrefix extends string,
    TClient extends Record<string, z.ZodType>
> = {
        [K in keyof TClient]: K extends `${TClientPrefix}${string}` ? TClient[K] : never;
    };

export async function defineConfig<T extends Config>(
    config: T & (T['env'] extends { client: Record<string, z.ZodType> }
        ? { env: { client: EnforceClientPrefix<T['env']['clientPrefix'], T['env']['client']> } }
        : {})
): Promise<InferConfig<T>> {
    // For build mode, skip validation if environment variable is set
    if (process.env.CONFIG_AS_CODE_BUILD_MODE === 'true') {
        return config as any;
    }

    let serverResult: any = {};
    let clientResult: any = {};

    // Process new server API
    if (config.server) {
        serverResult = await processConfigObject(config.server, 'server');
    }

    // Process new client API  
    if (config.client) {
        clientResult = await processConfigObject(config.client, 'client');
    }

    // Process existing env API if present
    if (config.env) {
        const envResult = await processEnvConfig(config.env);
        // Merge with new API results
        serverResult = { ...serverResult, ...envResult.server };
        clientResult = { ...clientResult, ...envResult.client };
    }

    return {
        server: serverResult,
        client: clientResult,
    } as InferConfig<T>;
}

async function processConfigObject(
    configObj: Record<string, ConfigField>,
    prefix: 'server' | 'client'
): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const [key, field] of Object.entries(configObj)) {
        const stableId = `${prefix}.${key}`;

        // Resolve value
        let resolvedValue: any;
        if (typeof field.value === 'function') {
            resolvedValue = await field.value(stableId);
        } else {
            resolvedValue = field.value;
        }

        // Validate resolved value
        try {
            const validatedValue = field.validation.parse(resolvedValue);
            result[key] = validatedValue;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error(
                    `Validation failed for ${stableId}: ${error.errors.map(e => e.message).join(', ')}`
                );
            }
            throw error;
        }
    }

    return result;
}

async function processEnvConfig(env: {
    server: Record<string, z.ZodType>;
    client: Record<string, z.ZodType>;
    clientPrefix: string;
    runtimeEnv: Record<string, string | undefined>;
    emptyStringAsUndefined?: boolean;
}): Promise<{ server: any; client: any }> {
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
            server: validatedServer,
            client: validatedClient,
        };
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
