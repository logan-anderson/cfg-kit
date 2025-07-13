import { z } from 'zod';

// Core ConfigField type
export type ConfigField<T = any, EnvType = any> = {
    validation: z.ZodType<T>;
    value: T | ((args: { stableId: string, env: EnvType }) => T | Promise<T>);
};

type InferConfigObject<T extends Record<string, ConfigField>> = {
    [K in keyof T]: T[K] extends ConfigField<infer U, any> ? U : never;
};

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

// Plugin type that defines the shape of a plugin configuration
export type PluginConfig = {
    server?: Record<string, ConfigField>;
    client?: Record<string, ConfigField>;
    env?: {
        server: Record<string, z.ZodType>;
        client: Record<string, z.ZodType>;
    };
};

// Base Plugin class that all plugins must extend
export abstract class Plugin {
    abstract build(): PluginConfig | Promise<PluginConfig>;
}

// Utility type to merge multiple plugin configs
type MergePluginConfigs<T extends PluginConfig[]> = T extends readonly [infer First, ...infer Rest]
    ? First extends PluginConfig
    ? Rest extends PluginConfig[]
    ? {
        server: (First['server'] extends Record<string, ConfigField> ? First['server'] : {}) &
        (MergePluginConfigs<Rest>['server'] extends Record<string, ConfigField> ? MergePluginConfigs<Rest>['server'] : {});
        client: (First['client'] extends Record<string, ConfigField> ? First['client'] : {}) &
        (MergePluginConfigs<Rest>['client'] extends Record<string, ConfigField> ? MergePluginConfigs<Rest>['client'] : {});
        env: {
            server: (First['env'] extends { server: Record<string, z.ZodType> } ? First['env']['server'] : {}) &
            (MergePluginConfigs<Rest>['env'] extends { server: Record<string, z.ZodType> } ? MergePluginConfigs<Rest>['env']['server'] : {});
            client: (First['env'] extends { client: Record<string, z.ZodType> } ? First['env']['client'] : {}) &
            (MergePluginConfigs<Rest>['env'] extends { client: Record<string, z.ZodType> } ? MergePluginConfigs<Rest>['env']['client'] : {});
        };
    }
    : First
    : {}
    : {
        server: {};
        client: {};
        env: { server: {}; client: {} };
    };

// Utility type to infer env types from plugin configs
type InferPluginEnvTypes<T extends PluginConfig[]> = {
    server: MergePluginConfigs<T>['env']['server'];
    client: MergePluginConfigs<T>['env']['client'];
};

// Type to help extract zod schema types
type InferEnvType<T extends Record<string, z.ZodType>> = z.infer<z.ZodObject<T>>;

// Type to infer the final merged config type
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

// Plugin Builder class - has the same API as ConfigBuilder but for plugins
class PluginBuilder<
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
    }): PluginBuilder<NewTServerEnv, NewTClientEnv, NewTClientPrefix> {
        const newBuilder = new PluginBuilder<NewTServerEnv, NewTClientEnv, NewTClientPrefix>();
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

    defineConfig(
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
    ): PluginConfig {
        if (!this.envConfig) {
            throw new Error('buildEnv() must be called before defineConfig() in a plugin');
        }

        // Handle both callback and direct object patterns
        const config = typeof configOrCallback === 'function'
            ? configOrCallback({ serverField: this.serverField.bind(this), clientField: this.clientField.bind(this) })
            : configOrCallback || {};

        // Return the plugin config structure
        return {
            ...config,
            env: {
                server: this.serverEnvSchemas,
                client: this.clientEnvSchemas,
            }
        };
    }
}

// Export plugin builder instance
export const pluginBuilder = new PluginBuilder();

// Clean builder API - define env once, use everywhere!
class ConfigBuilder<
    TServerEnv extends Record<string, z.ZodType> = {},
    TClientEnv extends Record<string, z.ZodType> = {},
    TClientPrefix extends string = string,
    TPlugins extends Plugin[] = []
> {
    private serverEnvSchemas: TServerEnv = {} as TServerEnv;
    private clientEnvSchemas: TClientEnv = {} as TClientEnv;
    private envConfig: {
        clientPrefix: TClientPrefix;
        runtimeEnv: Record<string, string | undefined>;
        emptyStringAsUndefined?: boolean;
    } | null = null;
    private plugins: TPlugins = [] as any;

    addPlugins<NewTPlugins extends Plugin[]>(plugins: NewTPlugins): ConfigBuilder<TServerEnv, TClientEnv, TClientPrefix, NewTPlugins> {
        const newBuilder = new ConfigBuilder<TServerEnv, TClientEnv, TClientPrefix, NewTPlugins>();
        newBuilder.serverEnvSchemas = this.serverEnvSchemas;
        newBuilder.clientEnvSchemas = this.clientEnvSchemas;
        newBuilder.envConfig = this.envConfig;
        newBuilder.plugins = plugins as any;
        return newBuilder;
    }

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
    }): ConfigBuilder<NewTServerEnv, NewTClientEnv, NewTClientPrefix, TPlugins> {
        // Create a new builder instance with the env schemas and config
        const newBuilder = new ConfigBuilder<NewTServerEnv, NewTClientEnv, NewTClientPrefix, TPlugins>();
        newBuilder.serverEnvSchemas = config.server;
        newBuilder.clientEnvSchemas = config.client;
        newBuilder.envConfig = {
            clientPrefix: config.clientPrefix,
            runtimeEnv: config.runtimeEnv,
            emptyStringAsUndefined: config.emptyStringAsUndefined,
        };
        newBuilder.plugins = this.plugins;
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

        // Build plugin configurations
        const pluginConfigs: PluginConfig[] = [];
        for (const plugin of this.plugins) {
            const pluginConfig = await plugin.build();
            pluginConfigs.push(pluginConfig);
        }

        // Merge plugin configurations
        const mergedPluginConfig = this.mergePluginConfigs(pluginConfigs);

        // Merge main config with plugin configs
        const mergedServerEnv = { ...this.serverEnvSchemas, ...mergedPluginConfig.env?.server };
        const mergedClientEnv = { ...this.clientEnvSchemas, ...mergedPluginConfig.env?.client };
        const mergedServerConfig = { ...config.server, ...mergedPluginConfig.server };
        const mergedClientConfig = { ...config.client, ...mergedPluginConfig.client };

        // Use the stored env config and merge with schemas
        const fullConfig = {
            server: mergedServerConfig,
            client: mergedClientConfig,
            env: {
                ...this.envConfig,
                server: mergedServerEnv,
                client: mergedClientEnv,
            }
        };

        return defineConfig(fullConfig);
    }

    private mergePluginConfigs(configs: PluginConfig[]): PluginConfig {
        return configs.reduce((merged, config) => ({
            server: { ...merged.server, ...config.server },
            client: { ...merged.client, ...config.client },
            env: {
                server: { ...merged.env?.server, ...config.env?.server },
                client: { ...merged.env?.client, ...config.env?.client },
            }
        }), {
            server: {},
            client: {},
            env: { server: {}, client: {} }
        });
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

    let validatedServerEnv: any;
    let validatedClientEnv: any;

    // Validate server environment
    try {
        validatedServerEnv = serverSchema.parse(serverEnvValues);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map(err => {
                const path = err.path.join('.');
                return `${path}: ${err.message}`;
            }).join('\n');
            throw new Error(`Server environment validation failed:\n${errorMessages}`);
        }
        throw error;
    }

    // Validate client environment
    try {
        validatedClientEnv = clientSchema.parse(clientEnvValues);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map(err => {
                const path = err.path.join('.');
                return `${path}: ${err.message}`;
            }).join('\n');
            throw new Error(`Client environment validation failed:\n${errorMessages}`);
        }
        throw error;
    }

    return {
        server: validatedServerEnv,
        client: validatedClientEnv,
    };
}

// Type inference helper for zod types (for build CLI)
function inferZodType(zodType: z.ZodType): string {
    const zodTypeName = (zodType as any)?._def?.typeName;

    switch (zodTypeName) {
        case 'ZodString':
            return 'string';
        case 'ZodNumber':
            return 'number';
        case 'ZodBoolean':
            return 'boolean';
        case 'ZodArray':
            const elementType = inferZodType((zodType as any)._def.type);
            return `${elementType}[]`;
        case 'ZodObject':
            const shape = (zodType as any)._def.shape();
            const properties = Object.entries(shape)
                .map(([key, value]) => `${key}: ${inferZodType(value as z.ZodType)}`)
                .join('; ');
            return `{ ${properties} }`;
        case 'ZodUnion':
            const options = (zodType as any)._def.options;
            return options.map((option: z.ZodType) => inferZodType(option)).join(' | ');
        case 'ZodOptional':
            const innerType = inferZodType((zodType as any)._def.innerType);
            return `${innerType} | undefined`;
        case 'ZodNullable':
            const nullableInner = inferZodType((zodType as any)._def.innerType);
            return `${nullableInner} | null`;
        default:
            return 'any';
    }
}
