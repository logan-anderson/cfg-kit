import fs from 'fs';
import path from 'path';
import { build } from 'esbuild';

interface BuildOptions {
    output: string;
}

export async function buildConfig(configPath: string, options: BuildOptions): Promise<void> {
    const { output } = options;
    const resolvedConfigPath = path.resolve(configPath);

    console.log(`📦 Building config from ${resolvedConfigPath}`);

    // Check if config file exists
    if (!fs.existsSync(resolvedConfigPath)) {
        throw new Error(`Config file not found: ${resolvedConfigPath}`);
    }

    // Create temporary files for server and client configs
    const tempDir = path.join(process.cwd(), '.config-as-code-temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const serverTempFile = path.join(tempDir, 'server.js');
    const clientTempFile = path.join(tempDir, 'client.js');

    try {
        // First, compile the original config file to JavaScript if it's TypeScript
        const compiledConfigPath = await compileConfig(resolvedConfigPath, tempDir);

        // Generate server config file
        const serverCode = generateServerConfig(compiledConfigPath);
        fs.writeFileSync(serverTempFile, serverCode);

        // Generate client config file
        const clientCode = generateClientConfig(compiledConfigPath);
        fs.writeFileSync(clientTempFile, clientCode);

        // Build server config
        await build({
            entryPoints: [serverTempFile],
            bundle: true,
            platform: 'node',
            target: 'node16',
            outfile: path.join(output, 'config.server.js'),
            format: 'cjs',
            external: ['zod'],
            logLevel: 'silent',
        });

        // Build client config
        await build({
            entryPoints: [clientTempFile],
            bundle: true,
            platform: 'neutral',
            target: 'es2020',
            outfile: path.join(output, 'config.client.js'),
            format: 'cjs',
            external: ['zod'],
            logLevel: 'silent',
        });

        console.log(`✅ Server config: ${path.join(output, 'config.server.js')}`);
        console.log(`✅ Client config: ${path.join(output, 'config.client.js')}`);

    } finally {
        // Clean up temporary files
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

async function compileConfig(configPath: string, tempDir: string): Promise<string> {
    const ext = path.extname(configPath);

    if (ext === '.js') {
        // Already JavaScript, return as-is
        return configPath;
    }

    if (ext === '.ts') {
        // Compile TypeScript to JavaScript
        const compiledPath = path.join(tempDir, 'compiled-config.js');

        await build({
            entryPoints: [configPath],
            bundle: true,
            platform: 'node',
            target: 'node16',
            outfile: compiledPath,
            format: 'cjs',
            external: ['zod', 'config-as-code'],
            logLevel: 'silent',
        });

        return compiledPath;
    }

    throw new Error(`Unsupported config file extension: ${ext}`);
}

function generateServerConfig(configPath: string): string {
    const relativePath = path.relative(process.cwd(), configPath);

    return `
// Auto-generated server config
const { defineConfig } = require('config-as-code');
const { z } = require('zod');

// Set build mode to skip validation during config extraction
process.env.CONFIG_AS_CODE_BUILD_MODE = 'true';

// Import the compiled config
const originalConfig = require('${configPath}');

// Extract server-side configuration
function createServerConfig() {
  const config = originalConfig.env || originalConfig.default?.env || originalConfig.default;
  const envConfig = config?.env || config;
  
  if (!envConfig) {
    throw new Error('No env configuration found in ${relativePath}');
  }
  
  // Reset build mode before creating server config
  delete process.env.CONFIG_AS_CODE_BUILD_MODE;
  
  const serverConfig = defineConfig({
    env: {
      server: envConfig.server,
      client: {}, // Empty client config for server build
      clientPrefix: envConfig.clientPrefix || 'PUBLIC_',
      runtimeEnv: envConfig.runtimeEnv || process.env,
      emptyStringAsUndefined: envConfig.emptyStringAsUndefined || false,
    }
  });
  
  // Return only server keys
  const serverKeys = Object.keys(envConfig.server);
  const result = {};
  for (const key of serverKeys) {
    result[key] = serverConfig[key];
  }
  
  return result;
}

module.exports = createServerConfig();
`;
}

function generateClientConfig(configPath: string): string {
    const relativePath = path.relative(process.cwd(), configPath);

    return `
// Auto-generated client config
const { defineConfig } = require('config-as-code');
const { z } = require('zod');

// Set build mode to skip validation during config extraction
process.env.CONFIG_AS_CODE_BUILD_MODE = 'true';

// Import the compiled config
const originalConfig = require('${configPath}');

// Extract client-side configuration
function createClientConfig() {
  const config = originalConfig.env || originalConfig.default?.env || originalConfig.default;
  const envConfig = config?.env || config;
  
  if (!envConfig) {
    throw new Error('No env configuration found in ${relativePath}');
  }
  
  // Reset build mode before creating client config
  delete process.env.CONFIG_AS_CODE_BUILD_MODE;
  
  const clientConfig = defineConfig({
    env: {
      server: {}, // Empty server config for client build
      client: envConfig.client,
      clientPrefix: envConfig.clientPrefix || 'PUBLIC_',
      runtimeEnv: envConfig.runtimeEnv || process.env,
      emptyStringAsUndefined: envConfig.emptyStringAsUndefined || false,
    }
  });
  
  // Return only client keys
  const clientKeys = Object.keys(envConfig.client);
  const result = {};
  for (const key of clientKeys) {
    result[key] = clientConfig[key];
  }
  
  return result;
}

module.exports = createClientConfig();
`;
} 