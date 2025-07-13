import { PostHog } from 'posthog-node'
import { z } from 'zod'
import { Plugin, pluginBuilder, ConfigField } from 'cfg-kit'
import fetch from 'node-fetch'
import {
    PostHogFeatureFlagSchema,
    PostHogConfigSchema,
    PostHogFeatureFlag,
    PostHogConfig,
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
export interface PostHogPluginOptions {
    posthog?: PostHog
    apiKey: string
    host?: string
    projectId: string
}
type PostHogPluginConfig = z.infer<typeof PostHogConfigSchema>

// Re-export schemas and types for convenience
export {
    PostHogFeatureFlagSchema,
    PostHogConfigSchema,
    PostHogFeatureFlag,
    PostHogConfig,
}

// Main plugin class
export class PostHogPlugin extends Plugin {
    private posthog: PostHog
    private config: PostHogPluginConfig
    private projectId: string

    constructor(config: PostHogPluginConfig, options: PostHogPluginOptions) {
        super()
        this.config = config
        this.projectId = options.projectId
        // PostHog will be injected as peer dependency
        this.posthog = options.posthog ?? new PostHog(options.apiKey, {
            host: options.host ?? 'https://app.posthog.com',
        })
    }

    async build() {
        return pluginBuilder.buildEnv({
            server: {
                POSTHOG_API_KEY: z.string().min(1),
                POSTHOG_HOST: z.string().optional(),
                POSTHOG_PROJECT_ID: z.string().min(1),
            },
            client: {},
            clientPrefix: '',
            runtimeEnv: {},
            emptyStringAsUndefined: true,
        }).defineConfig(({ serverField }: any) => {
            let featureFlagsAsFields: Record<string, ConfigField<string, { POSTHOG_API_KEY: string; POSTHOG_HOST?: string | undefined; POSTHOG_PROJECT_ID: string; }>> = {}

            for (const featureFlag of this.config.featureFlags) {
                featureFlagsAsFields[toValidJsVarName(featureFlag.key)] = serverField(z.string(), async ({ env }: any) => {
                    // If credentials are not available, return a placeholder ID
                    if (!env.POSTHOG_API_KEY || !env.POSTHOG_PROJECT_ID) {
                        console.log(`PostHog credentials not set for feature flag '${featureFlag.key}', returning placeholder ID`)
                        return `placeholder-${featureFlag.key}-id`
                    }

                    try {
                        // Check if feature flag exists
                        const response = await fetch(`${env.POSTHOG_HOST || 'https://app.posthog.com'}/api/projects/${env.POSTHOG_PROJECT_ID}/feature_flags/`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${env.POSTHOG_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                        })

                        if (!response.ok) {
                            throw new Error(`Failed to fetch feature flags: ${response.statusText}`)
                        }

                        const existingFlags = await response.json() as { results: { id: string, key: string }[] }
                        const existingFlag = existingFlags.results?.find((flag) => flag.key === featureFlag.key)

                        if (existingFlag) {
                            // Feature flag exists, return its ID without updating
                            // As per requirements: "only create feature flags if they are not defined"
                            console.log(`Feature flag '${featureFlag.key}' already exists, skipping creation`)
                            return existingFlag.id.toString()
                        }

                        // Feature flag doesn't exist, create it
                        const createResponse = await fetch(`${env.POSTHOG_HOST || 'https://app.posthog.com'}/api/projects/${env.POSTHOG_PROJECT_ID}/feature_flags/`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${env.POSTHOG_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                key: featureFlag.key,
                                name: featureFlag.name,
                                description: featureFlag.description,
                                active: featureFlag.active,
                                filters: featureFlag.filters,
                                variants: featureFlag.variants,
                                tags: featureFlag.tags,
                            }),
                        })

                        if (!createResponse.ok) {
                            const errorText = await createResponse.text()
                            throw new Error(`Failed to create feature flag '${featureFlag.key}': ${createResponse.statusText} - ${errorText}`)
                        }

                        const createdFlag = await createResponse.json() as { id: string }
                        console.log(`Created feature flag '${featureFlag.key}' with ID: ${createdFlag.id}`)
                        return createdFlag.id.toString()

                    } catch (error) {
                        console.error(`Error managing feature flag '${featureFlag.key}':`, error)
                        throw error
                    }
                })
            }

            return {
                server: {
                    ...featureFlagsAsFields,
                },
            }
        })
    }
}

// Helper functions for defining resources
export function definePostHogFeatureFlag(featureFlag: PostHogFeatureFlag): PostHogFeatureFlag {
    return PostHogFeatureFlagSchema.parse(featureFlag)
}

export function definePostHogConfig(config: PostHogConfig): PostHogConfig {
    return PostHogConfigSchema.parse(config)
}

// Default export
export default PostHogPlugin 