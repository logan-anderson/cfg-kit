import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true,
    format: ['cjs', 'esm'],
    target: 'node16',
    external: ['posthog-node', 'cfg-kit']
}) 