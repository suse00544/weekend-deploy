import { execa } from 'execa';
import ora from 'ora';
import chalk from 'chalk';
import { isInstalled } from '../utils.js';

export const vercel = {
  name: 'Vercel',
  cli: 'vercel',
  installHint: 'npm install -g vercel',

  /**
   * Check if Vercel CLI is available.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return isInstalled('vercel');
  },

  /**
   * Deploy to Vercel.
   * @param {object} options
   * @param {string} options.projectDir - Project root
   * @param {string} options.name - Project name
   * @param {boolean} [options.prod] - Deploy to production
   * @returns {Promise<string>} - Deployed URL
   */
  async deploy({ projectDir, name, prod = true }) {
    const spinner = ora('Deploying to Vercel...').start();

    try {
      const args = ['--yes'];
      if (prod) {
        args.push('--prod');
      }
      if (name) {
        args.push('--name', name);
      }

      const { stdout } = await execa('vercel', args, {
        cwd: projectDir,
        stdio: 'pipe',
        env: { ...process.env, BROWSER: 'none' },
      });

      const url = extractUrl(stdout);
      spinner.succeed('Deployed to Vercel');
      return url || stdout.trim().split('\n').pop();
    } catch (error) {
      spinner.fail('Vercel deployment failed');
      throw new Error(
        `Deployment failed: ${error.stderr || error.message}\n\n` +
        `Make sure you're logged in: ${chalk.cyan('vercel login')}`
      );
    }
  },
};

function extractUrl(stdout) {
  const match = stdout.match(/https:\/\/[^\s]+\.vercel\.app/);
  if (match) return match[0];
  // Vercel often just prints the URL as the last line
  const lines = stdout.trim().split('\n');
  const lastLine = lines[lines.length - 1].trim();
  if (lastLine.startsWith('https://')) return lastLine;
  return null;
}
