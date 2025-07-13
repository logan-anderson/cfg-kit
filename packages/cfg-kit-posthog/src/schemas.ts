import { z } from 'zod'

// PostHog feature flag schema
export const PostHogFeatureFlagSchema = z.object({
    key: z.string().min(1, 'Feature flag key is required'),
    name: z.string().min(1, 'Feature flag name is required'),
    description: z.string().optional(),
    active: z.boolean().default(true),
    filters: z.object({
        groups: z.array(z.object({
            properties: z.array(z.object({
                key: z.string(),
                operator: z.enum(['exact', 'is_not', 'icontains', 'not_icontains', 'regex', 'not_regex', 'gt', 'gte', 'lt', 'lte', 'is_set', 'is_not_set']).optional(),
                value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.array(z.number())]).optional(),
                type: z.enum(['person', 'event', 'element', 'static-cohort', 'behavioral']).optional(),
            })).default([]),
            rollout_percentage: z.number().min(0).max(100).default(100),
            variant: z.string().optional(),
        })).default([{
            properties: [],
            rollout_percentage: 100
        }])
    }).default({
        groups: [{
            properties: [],
            rollout_percentage: 100
        }]
    }),
    variants: z.array(z.object({
        key: z.string(),
        name: z.string().optional(),
        rollout_percentage: z.number().min(0).max(100),
    })).optional(),
    tags: z.array(z.string()).default([]),
})

export const PostHogConfigSchema = z.object({
    featureFlags: z.array(PostHogFeatureFlagSchema).default([]),
})

// Types
export type PostHogFeatureFlag = z.infer<typeof PostHogFeatureFlagSchema>
export type PostHogConfig = z.infer<typeof PostHogConfigSchema> 