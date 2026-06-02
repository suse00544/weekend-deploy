import { execa } from 'execa';
import ora from 'ora';
import chalk from 'chalk';
import { isInstalled } from '../utils.js';

export const netlify = {
  name: 'Netlify',
  cli: 'netlify',
  installHint: 'npm install -g netlify-cli',

  /**
   * Check if Netlify CLI is available.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return isInstalled('netlify');
  },

  /**
   * Deploy a static site to Netlify.
   * @param {object} options
   * @param {string} options.projectDir - Project root
   * @param {string} options.outputDir - Directory to deploy (relative to projectDir)
   * @param {string} options.name - Project name
   * @returns {Promise<string>} - Deployed URL
   */
  async deploy({ projectDir, outputDir, name }) {
    const deployDir = outputDir || '.';

    const spinner = ora('Deploying to Netlify...').start();

    try {
      const { stdout } = await execa(
        'netlify',
        ['deploy', '--prod', '--dir', deployDir, '--site', name],
        {
          cwd: projectDir,
          stdio: 'pipe',
        }
      );

      const url = extractUrl(stdout);
      spinner.succeed('Deployed to Netlify');
      return url || `https://${name}.netlify.app`;
    } catch (error) {
      // If --site fails, try without it (will prompt or use linked site)
      try {
        const { stdout } = await execa(
          'netlify',
          ['deploy', '--prod', '--dir', deployDir],
          {
            cwd: projectDir,
            stdio: 'pipe',
          }
        );
        const url = extractUrl(stdout);
        spinner.succeed('Deployed to Netlify');
        return url;
      } catch (retryError) {
        spinner.fail('Netlify deployment failed');
        throw new Error(
          `Deployment failed: ${retryError.stderr || retryError.message}\n\n` +
          `Make sure you're logged in: ${chalk.cyan('netlify login')}`
        );
      }
    }
  },
};

function extractUrl(stdout) {
  const match = stdout.match(/https:\/\/[^\s]+\.netlify\.app/);
  if (match) return match[0];
  // Also check for "Website URL:" pattern
  const urlMatch = stdout.match(/Website URL:\s*(https:\/\/[^\s]+)/);
  return urlMatch ? urlMatch[1] : null;
}
