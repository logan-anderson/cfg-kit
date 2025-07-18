import { build } from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

interface BuildOptions {
  output: string;
}

export async function buildConfig(configPath: string, { output }: BuildOptions): Promise<void> {
  const resolvedConfigPath = path.resolve(configPath);

  console.log(`📦 Building config from ${resolvedConfigPath}`);

  // Check if config file exists
  if (!fs.existsSync(resolvedConfigPath)) {
    throw new Error(`Config file not found: ${resolvedConfigPath}`);
  }

  // Create temporary files for server and client configs
  const tempDir = path.join(process.cwd(), '.cfg-kit-temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // First, compile the original config file to JavaScript if it's TypeScript
    const compiledConfigPath = await compileConfig(resolvedConfigPath, tempDir);

    // Get resolved config values (not raw config structure)
    const { serverConfig, clientConfig } = await getResolvedConfig(compiledConfigPath);

    // Extract type information from the original config
    const typeInfo = await extractTypeInfo(compiledConfigPath, tempDir);

    // Generate server config file
    const serverCode = generateServerConfig(serverConfig);
    fs.writeFileSync(path.join(output, 'config.server.js'), serverCode);

    // Generate client config file
    const clientCode = generateClientConfig(clientConfig);
    fs.writeFileSync(path.join(output, 'config.client.js'), clientCode);

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

  // Compile TypeScript to JavaScript
  const compiledPath = path.join(tempDir, 'compiled-config.js');

  await build({
    entryPoints: [configPath],
    bundle: true,
    platform: 'node',
    target: 'node16',
    outfile: compiledPath,
    format: 'cjs',
    external: ['zod', 'cfg-kit'],
    logLevel: 'silent',
  });


  return compiledPath;

}

async function getResolvedConfig(configPath: string): Promise<{ serverConfig: Record<string, any>, clientConfig: Record<string, any> }> {
  try {
    // Don't set build mode - we want resolved values
    delete process.env.CONFIG_AS_CODE_BUILD_MODE;

    // Clear the require cache to ensure fresh import
    delete require.cache[path.resolve(configPath)];

    // Import the compiled config and get resolved values
    const compiledConfig = require(path.resolve(configPath));
    let resolvedConfig = compiledConfig.default;

    // Handle async config
    if (typeof resolvedConfig === 'function' || (resolvedConfig && typeof resolvedConfig.then === 'function')) {
      resolvedConfig = await resolvedConfig;
    }

    return {
      serverConfig: resolvedConfig.server || {},
      clientConfig: resolvedConfig.client || {},
    };
  } catch (error) {
    throw new Error(`Failed to resolve config values: ${error instanceof Error ? error.message : String(error)}`);
  }
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
    let config = compiledConfig.default;

    // Handle async config
    if (typeof config === 'function' || (config && typeof config.then === 'function')) {
      config = await config;
    }

    const serverTypes: Record<string, string> = {};
    const clientTypes: Record<string, string> = {};

    // Extract types from new server API
    if (config.server) {
      for (const [key, field] of Object.entries(config.server)) {
        if (field && typeof field === 'object' && 'validation' in field) {
          serverTypes[key] = inferZodType((field as any).validation);
        }
      }
    }

    // Extract types from new client API
    if (config.client) {
      for (const [key, field] of Object.entries(config.client)) {
        if (field && typeof field === 'object' && 'validation' in field) {
          clientTypes[key] = inferZodType((field as any).validation);
        }
      }
    }

    // Extract types from legacy env API
    if (config.env) {
      const envConfig = config.env;

      // Extract server types from env
      for (const key of Object.keys(envConfig.server || {})) {
        const zodType = envConfig.server[key];
        serverTypes[key] = inferZodType(zodType);
      }

      // Extract client types from env
      for (const key of Object.keys(envConfig.client || {})) {
        const zodType = envConfig.client[key];
        clientTypes[key] = inferZodType(zodType);
      }
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

  if (zodSchema._def) {
    const typeName = zodSchema._def.typeName;
    switch (typeName) {
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodArray':
        const elementType = inferZodType(zodSchema._def.type);
        return `${elementType}[]`;
      case 'ZodObject':
        const shape = zodSchema._def.shape();
        const properties = Object.entries(shape)
          .map(([key, value]) => `${key}: ${inferZodType(value as any)}`)
          .join('; ');
        return `{ ${properties} }`;
      case 'ZodUnion':
        const options = zodSchema._def.options;
        return options.map((option: any) => inferZodType(option)).join(' | ');
      case 'ZodOptional':
        const innerType = inferZodType(zodSchema._def.innerType);
        return `${innerType} | undefined`;
      case 'ZodNullable':
        const nullableInner = inferZodType(zodSchema._def.innerType);
        return `${nullableInner} | null`;
      case 'ZodDefault':
        return inferZodType(zodSchema._def.innerType);
      default:
        return 'unknown';
    }
  }

  return 'unknown';
}

function generateServerDts(typeInfo: TypeInfo): string {
  const typeDeclarations = Object.entries(typeInfo.serverTypes)
    .map(([key, type]) => `export declare const ${key}: ${type};`)
    .join('\n');

  return `// Auto-generated server config types
${typeDeclarations}
`;
}

function generateClientDts(typeInfo: TypeInfo): string {
  const typeDeclarations = Object.entries(typeInfo.clientTypes)
    .map(([key, type]) => `export declare const ${key}: ${type};`)
    .join('\n');

  return `// Auto-generated client config types
${typeDeclarations}
`;
}

function generateServerConfig(serverConfig: Record<string, any>): string {
  const exports = Object.entries(serverConfig)
    .map(([key, value]) => `module.exports.${key} = ${JSON.stringify(value)};`)
    .join('\n');

  return `
// Auto-generated server config
${exports}
`;
}

function generateClientConfig(clientConfig: Record<string, any>): string {
  const exports = Object.entries(clientConfig)
    .map(([key, value]) => `module.exports.${key} = ${JSON.stringify(value)};`)
    .join('\n');

  return `
// Auto-generated client config
${exports}
`;
} 