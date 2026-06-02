import { execa } from 'execa';
import ora from 'ora';
import chalk from 'chalk';
import { isInstalled } from '../utils.js';

export const cloudflare = {
  name: 'Cloudflare Pages',
  cli: 'wrangler',
  installHint: 'npm install -g wrangler',

  /**
   * Check if wrangler CLI is available.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return isInstalled('wrangler');
  },

  /**
   * Deploy a static site to Cloudflare Pages.
   * @param {object} options
   * @param {string} options.projectDir - Project root
   * @param {string} options.outputDir - Directory to deploy (relative to projectDir)
   * @param {string} options.name - Project name
   * @returns {Promise<string>} - Deployed URL
   */
  async deploy({ projectDir, outputDir, name }) {
    const deployDir = outputDir || '.';
    const projectName = sanitizeName(name);

    const spinner = ora(`Deploying to Cloudflare Pages...`).start();

    try {
      const { stdout } = await execa(
        'wrangler',
        ['pages', 'deploy', deployDir, '--project-name', projectName],
        {
          cwd: projectDir,
          stdio: 'pipe',
          env: { ...process.env, BROWSER: 'none' },
        }
      );

      const url = extractUrl(stdout);
      spinner.succeed(`Deployed to Cloudflare Pages`);
      return url || `https://${projectName}.pages.dev`;
    } catch (error) {
      spinner.fail('Cloudflare Pages deployment failed');
      throw new Error(
        `Deployment failed: ${error.stderr || error.message}\n\n` +
        `Make sure you're logged in: ${chalk.cyan('wrangler login')}`
      );
    }
  },
};

function sanitizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 58);
}

function extractUrl(stdout) {
  // Wrangler prints the URL in its output
  const match = stdout.match(/https:\/\/[^\s]+\.pages\.dev/);
  return match ? match[0] : null;
}
