import chokidar from 'chokidar';
import path from 'path';
import { buildConfig } from './build';

interface DevOptions {
    output: string;
}

export async function devConfig(configPath: string, options: DevOptions): Promise<never> {
    const resolvedConfigPath = path.resolve(configPath);

    console.log(`👀 Watching ${resolvedConfigPath} for changes...`);

    // Initial build
    try {
        await buildConfig(configPath, options);
        console.log('🚀 Initial build completed');
    } catch (error) {
        console.error('❌ Initial build failed:', (error as Error).message);
    }

    // Watch for changes
    const watcher = chokidar.watch(resolvedConfigPath, {
        persistent: true,
        ignoreInitial: true,
    });

    let isBuilding = false;

    watcher.on('change', async () => {
        if (isBuilding) {
            return; // Skip if already building
        }

        isBuilding = true;
        console.log(`\n🔄 Config file changed, rebuilding...`);

        try {
            await buildConfig(configPath, options);
            console.log('✅ Rebuild completed');
        } catch (error) {
            console.error('❌ Rebuild failed:', (error as Error).message);
        }

        isBuilding = false;
    });

    watcher.on('error', (error: unknown) => {
        console.error('❌ Watcher error:', error);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down watcher...');
        watcher.close();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n🛑 Shutting down watcher...');
        watcher.close();
        process.exit(0);
    });

    // Keep the process alive
    return new Promise(() => { }) as never;
} 