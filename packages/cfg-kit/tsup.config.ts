import { defineConfig } from 'tsup'

export default defineConfig([
    // Main library
    {
        entry: ['src/index.ts'],
        splitting: false,
        sourcemap: true,
        clean: true,
        dts: true,
        format: ['cjs', 'esm'],
    },
    // CLI
    {
        entry: ['src/cli/index.ts'],
        outDir: 'dist/cli',
        splitting: false,
        sourcemap: true,
        clean: false,
        format: ['cjs'],
        platform: 'node',
        target: 'node16',
        shims: true,
    },
]) 