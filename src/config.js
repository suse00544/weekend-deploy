import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

/**
 * @typedef {object} DeployConfig
 * @property {string} [platform] - Force a specific platform
 * @property {string} [name] - Project name override
 * @property {string} [buildCommand] - Custom build command
 * @property {string} [outputDir] - Custom output directory
 * @property {Record<string, string>} [env] - Environment variables
 * @property {string} [region] - Deployment region
 */

const CONFIG_FILES = ['deploy.yaml', 'deploy.yml'];

/**
 * Read optional deploy.yaml from the project root.
 * @param {string} projectDir - Absolute path to the project
 * @returns {DeployConfig}
 */
export function readConfig(projectDir) {
  for (const filename of CONFIG_FILES) {
    const filepath = join(projectDir, filename);
    if (existsSync(filepath)) {
      try {
        const raw = readFileSync(filepath, 'utf-8');
        const config = parse(raw) || {};
        return normalizeConfig(config);
      } catch (error) {
        // Malformed yaml — treat as no config
        return {};
      }
    }
  }
  return {};
}

/**
 * Normalize and validate config values.
 * @param {object} raw
 * @returns {DeployConfig}
 */
function normalizeConfig(raw) {
  const config = {};

  if (typeof raw.platform === 'string') {
    config.platform = raw.platform.toLowerCase();
  }
  if (typeof raw.name === 'string') {
    config.name = raw.name;
  }
  if (typeof raw.build === 'string') {
    config.buildCommand = raw.build;
  }
  if (typeof raw.output === 'string') {
    config.outputDir = raw.output;
  }
  if (raw.env && typeof raw.env === 'object') {
    config.env = raw.env;
  }
  if (typeof raw.region === 'string') {
    config.region = raw.region;
  }

  return config;
}
