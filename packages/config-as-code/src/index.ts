import { z } from 'zod';

// Core ConfigField type
export type ConfigField<T = any, EnvType = any> = {
    validation: z.ZodType<T>;
    value: T | ((args: { stableId: string, env: EnvType }) => T | Promise<T>);
};

// Helper type to infer env type from zod schema
type InferEnvType<T extends Record<string, z.ZodType>> = z.infer<z.ZodObject<T>>;

// Base config type
export type Config = {
    server?: Record<string, ConfigField>;
    client?: Record<string, ConfigField>;
    env?: {
        server: Record<string, z.ZodType>;
        client: Record<string, z.ZodType>;
        clientPrefix: string;
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
    server: T['server'] extends Record<string, ConfigField>
    ? InferConfigObject<T['server']>
    : T['env'] extends { server: Record<string, z.ZodType> }
    ? z.infer<z.ZodObject<T['env']['server']>>
    : {};
    client: T['client'] extends Record<string, ConfigField>
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

// Helper function to create typed field builders
export function createFieldHelpers<
    TServerEnv extends Record<string, z.ZodType>,
    TClientEnv extends Record<string, z.ZodType>
>() {
    return {
        serverField: <T>(
            validation: z.ZodType<T>,
            value: T | ((args: { stableId: string, env: InferEnvType<TServerEnv> }) => T | Promise<T>)
        ): ConfigField<T, InferEnvType<TServerEnv>> => ({ validation, value }),

        clientField: <T>(
            validation: z.ZodType<T>,
            value: T | ((args: { stableId: string, env: InferEnvType<TClientEnv> }) => T | Promise<T>)
        ): ConfigField<T, InferEnvType<TClientEnv>> => ({ validation, value })
    };
}

// Clean builder API - define env once, use everywhere!
class ConfigBuilder<
    TServerEnv extends Record<string, z.ZodType> = {},
    TClientEnv extends Record<string, z.ZodType> = {},
    TClientPrefix extends string = string
> {
    private serverEnvSchemas: TServerEnv = {} as TServerEnv;
    private clientEnvSchemas: TClientEnv = {} as TClientEnv;
    private envConfig: {
        clientPrefix: TClientPrefix;
        runtimeEnv: Record<string, string | undefined>;
        emptyStringAsUndefined?: boolean;
    } | null = null;

    buildEnv<
        NewTServerEnv extends Record<string, z.ZodType>,
        NewTClientEnv extends Record<string, z.ZodType>,
        NewTClientPrefix extends string
    >(config: {
        server: NewTServerEnv;
        client: NewTClientEnv;
        clientPrefix: NewTClientPrefix;
        runtimeEnv: Record<string, string | undefined>;
        emptyStringAsUndefined?: boolean;
    }): ConfigBuilder<NewTServerEnv, NewTClientEnv, NewTClientPrefix> {
        // Create a new builder instance with the env schemas and config
        const newBuilder = new ConfigBuilder<NewTServerEnv, NewTClientEnv, NewTClientPrefix>();
        newBuilder.serverEnvSchemas = config.server;
        newBuilder.clientEnvSchemas = config.client;
        newBuilder.envConfig = {
            clientPrefix: config.clientPrefix,
            runtimeEnv: config.runtimeEnv,
            emptyStringAsUndefined: config.emptyStringAsUndefined,
        };
        return newBuilder;
    }

    serverField<T>(
        validation: z.ZodType<T>,
        value: T | ((args: { stableId: string, env: InferEnvType<TServerEnv> }) => T | Promise<T>)
    ): ConfigField<T, InferEnvType<TServerEnv>> {
        return { validation, value };
    }

    clientField<T>(
        validation: z.ZodType<T>,
        value: T | ((args: { stableId: string, env: InferEnvType<TClientEnv> }) => T | Promise<T>)
    ): ConfigField<T, InferEnvType<TClientEnv>> {
        return { validation, value };
    }

    async defineConfig(
        configOrCallback?:
            | {
                server?: Record<string, ConfigField<any, InferEnvType<TServerEnv>>>;
                client?: Record<string, ConfigField<any, InferEnvType<TClientEnv>>>;
            }
            | ((helpers: {
                serverField: <T>(validation: z.ZodType<T>, value: T | ((args: { stableId: string, env: InferEnvType<TServerEnv> }) => T | Promise<T>)) => ConfigField<T, InferEnvType<TServerEnv>>;
                clientField: <T>(validation: z.ZodType<T>, value: T | ((args: { stableId: string, env: InferEnvType<TClientEnv> }) => T | Promise<T>)) => ConfigField<T, InferEnvType<TClientEnv>>;
            }) => {
                server?: Record<string, ConfigField<any, InferEnvType<TServerEnv>>>;
                client?: Record<string, ConfigField<any, InferEnvType<TClientEnv>>>;
            })
    ) {
        if (!this.envConfig) {
            throw new Error('buildEnv() must be called before defineConfig()');
        }

        // Handle both callback and direct object patterns
        const config = typeof configOrCallback === 'function'
            ? configOrCallback({ serverField: this.serverField.bind(this), clientField: this.clientField.bind(this) })
            : configOrCallback || {};

        // Use the stored env config and merge with schemas
        const fullConfig = {
            ...config,
            env: {
                ...this.envConfig,
                server: this.serverEnvSchemas,
                client: this.clientEnvSchemas,
            }
        };

        return defineConfig(fullConfig);
    }
}

export const configBuilder = new ConfigBuilder();

// Simple defineConfig function
export async function defineConfig<T extends Config>(config: T): Promise<InferConfig<T>> {
    // For build mode, skip validation if environment variable is set
    if (process.env.CONFIG_AS_CODE_BUILD_MODE === 'true') {
        return config as any;
    }

    let serverResult: any = {};
    let clientResult: any = {};
    let envResult: any = {};

    // Process existing env API if present
    if (config.env) {
        envResult = await processEnvConfig(config.env);
    }

    // Process new server API
    if (config.server) {
        serverResult = await processConfigObject(config.server, 'server', envResult.server || {});
    }

    // Process new client API  
    if (config.client) {
        clientResult = await processConfigObject(config.client, 'client', envResult.client || {});
    }

    // Merge with new API results
    serverResult = { ...serverResult, ...envResult.server };
    clientResult = { ...clientResult, ...envResult.client };

    return {
        server: serverResult,
        client: clientResult,
    } as InferConfig<T>;
}

async function processConfigObject(
    configObj: Record<string, ConfigField>,
    prefix: 'server' | 'client',
    env: any
): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const [key, field] of Object.entries(configObj)) {
        const stableId = `${prefix}.${key}`;

        // Resolve value
        let resolvedValue: any;
        if (typeof field.value === 'function') {
            resolvedValue = await field.value({
                stableId,
                env
            });
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
