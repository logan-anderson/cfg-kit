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

    // Extract type information from the original config
    const typeInfo = await extractTypeInfo(compiledConfigPath, tempDir);

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

    // Generate TypeScript declaration files
    const serverDts = generateServerDts(typeInfo);
    const clientDts = generateClientDts(typeInfo);

    fs.writeFileSync(path.join(output, 'config.server.d.ts'), serverDts);
    fs.writeFileSync(path.join(output, 'config.client.d.ts'), clientDts);

    console.log(`✅ Server config: ${path.join(output, 'config.server.js')}`);
    console.log(`✅ Server types: ${path.join(output, 'config.server.d.ts')}`);
    console.log(`✅ Client config: ${path.join(output, 'config.client.js')}`);
    console.log(`✅ Client types: ${path.join(output, 'config.client.d.ts')}`);

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

interface TypeInfo {
  serverTypes: Record<string, string>;
  clientTypes: Record<string, string>;
}

async function extractTypeInfo(configPath: string, tempDir: string): Promise<TypeInfo> {
  try {
    // Set build mode to skip validation during type extraction
    process.env.CONFIG_AS_CODE_BUILD_MODE = 'true';

    // Clear the require cache to ensure fresh import
    delete require.cache[path.resolve(configPath)];

    // Import the compiled config and extract schema info
    const compiledConfig = require(path.resolve(configPath));

    const config = compiledConfig.env || compiledConfig.default?.env || compiledConfig.default;
    const envConfig = config?.env || config;

    if (!envConfig) {
      throw new Error('No env configuration found');
    }

    const serverTypes: Record<string, string> = {};
    const clientTypes: Record<string, string> = {};

    // Extract server types
    for (const key of Object.keys(envConfig.server || {})) {
      const zodType = envConfig.server[key];
      serverTypes[key] = inferZodType(zodType);
    }

    // Extract client types
    for (const key of Object.keys(envConfig.client || {})) {
      const zodType = envConfig.client[key];
      clientTypes[key] = inferZodType(zodType);
    }

    // Reset build mode
    delete process.env.CONFIG_AS_CODE_BUILD_MODE;

    return { serverTypes, clientTypes };
  } catch (error) {
    // Reset build mode on error
    delete process.env.CONFIG_AS_CODE_BUILD_MODE;
    throw error;
  }
}

function inferZodType(zodSchema: any): string {
  if (!zodSchema || typeof zodSchema !== 'object') {
    return 'unknown';
  }

  // This is a simplified type inference - in a real implementation,
  // we'd need to introspect the Zod schema more deeply
  if (zodSchema._def) {
    const typeName = zodSchema._def.typeName;
    switch (typeName) {
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodOptional':
        return inferZodType(zodSchema._def.innerType) + ' | undefined';
      case 'ZodDefault':
        return inferZodType(zodSchema._def.innerType);
      case 'ZodArray':
        return inferZodType(zodSchema._def.type) + '[]';
      default:
        return 'unknown';
    }
  }

  return 'unknown';
}

function generateServerDts(typeInfo: TypeInfo): string {
  const typeDeclarations = Object.entries(typeInfo.serverTypes)
    .map(([key, type]) => `  ${key}: ${type};`)
    .join('\n');

  return `// Auto-generated server config types
declare const config: {
${typeDeclarations}
};

export default config;
`;
}

function generateClientDts(typeInfo: TypeInfo): string {
  const typeDeclarations = Object.entries(typeInfo.clientTypes)
    .map(([key, type]) => `  ${key}: ${type};`)
    .join('\n');

  return `// Auto-generated client config types
declare const config: {
${typeDeclarations}
};

export default config;
`;
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