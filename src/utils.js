import { execa } from 'execa';
import ora from 'ora';
import chalk from 'chalk';

/**
 * Check if a CLI tool is installed and available in PATH.
 * @param {string} command - The command to check (e.g., 'wrangler', 'vercel')
 * @returns {Promise<boolean>}
 */
export async function isInstalled(command) {
  try {
    await execa('which', [command]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a shell command with a spinner.
 * @param {string} label - Spinner label
 * @param {string} command - Command to run
 * @param {string[]} args - Command arguments
 * @param {object} [options] - execa options
 * @returns {Promise<import('execa').ExecaReturnValue>}
 */
export async function runWithSpinner(label, command, args = [], options = {}) {
  const spinner = ora(label).start();
  try {
    const result = await execa(command, args, {
      stdio: 'pipe',
      ...options,
    });
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

/**
 * Run a shell command and return stdout, suppressing errors.
 * @param {string} command
 * @param {string[]} args
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export async function runQuiet(command, args = [], options = {}) {
  try {
    const { stdout } = await execa(command, args, { stdio: 'pipe', ...options });
    return stdout.trim();
  } catch {
    return '';
  }
}

/**
 * Print a formatted error message and exit.
 * @param {string} message
 */
export function fatal(message) {
  console.error(chalk.red(`\n  Error: ${message}\n`));
  process.exit(1);
}

/**
 * Print a box-style success message with the deployed URL.
 * @param {string} url
 * @param {string} platform
 */
export function printSuccess(url, platform) {
  const line = '─'.repeat(url.length + 10);
  console.log('');
  console.log(chalk.green(`  ┌${line}┐`));
  console.log(chalk.green(`  │  Deployed to ${platform}!${' '.repeat(url.length + 10 - ` Deployed to ${platform}!`.length - 1)}│`));
  console.log(chalk.green(`  │  ${chalk.bold.underline(url)}${' '.repeat(10 - 4)}│`));
  console.log(chalk.green(`  └${line}┘`));
  console.log('');
}

/**
 * Ensure a git repository exists in the target directory.
 * @param {string} cwd - Working directory
 */
export async function ensureGitRepo(cwd) {
  const spinner = ora('Checking git repository...').start();
  try {
    await execa('git', ['rev-parse', '--is-inside-work-tree'], { cwd, stdio: 'pipe' });
    spinner.succeed('Git repository found');
  } catch {
    spinner.text = 'Initializing git repository...';
    await execa('git', ['init'], { cwd, stdio: 'pipe' });
    await execa('git', ['add', '-A'], { cwd, stdio: 'pipe' });
    await execa('git', ['commit', '-m', 'Initial commit'], { cwd, stdio: 'pipe' });
    spinner.succeed('Git repository initialized');
  }
}
