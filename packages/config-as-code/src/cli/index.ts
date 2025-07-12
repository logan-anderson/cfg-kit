#!/usr/bin/env node

import { Command } from 'commander';
import { buildConfig } from './build';
import { devConfig } from './dev';

// Import version from package.json
import { readFileSync } from 'fs';
import { join } from 'path';

const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const program = new Command();

program
    .name('config-as-code')
    .description('CLI for config-as-code library')
    .version(packageJson.version);

program
    .command('build')
    .description('Build config into separate server and client files')
    .argument('[config]', 'Path to config file', 'config.ts')
    .option('-o, --output <dir>', 'Output directory', '.')
    .action(async (configPath: string, options: { output: string }) => {
        try {
            await buildConfig(configPath, options);
            console.log('✅ Build completed successfully');
        } catch (error) {
            console.error('❌ Build failed:', (error as Error).message);
            process.exit(1);
        }
    });

program
    .command('dev')
    .description('Watch config file and rebuild on changes')
    .argument('[config]', 'Path to config file', 'config.ts')
    .option('-o, --output <dir>', 'Output directory', '.')
    .action(async (configPath: string, options: { output: string }) => {
        try {
            await devConfig(configPath, options);
        } catch (error) {
            console.error('❌ Dev mode failed:', (error as Error).message);
            process.exit(1);
        }
    });

program.parse(); 