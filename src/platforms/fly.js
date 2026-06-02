import { execa } from 'execa';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ora from 'ora';
import chalk from 'chalk';
import { isInstalled } from '../utils.js';

export const fly = {
  name: 'Fly.io',
  cli: 'fly',
  installHint: 'curl -L https://fly.io/install.sh | sh',

  /**
   * Check if Fly CLI is available.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    // fly or flyctl
    return (await isInstalled('fly')) || (await isInstalled('flyctl'));
  },

  /**
   * Deploy to Fly.io.
   * @param {object} options
   * @param {string} options.projectDir - Project root
   * @param {string} options.name - Project name
   * @param {string} options.type - Project type (fastapi, flask, express, node, python)
   * @param {string} [options.region] - Deployment region
   * @returns {Promise<string>} - Deployed URL
   */
  async deploy({ projectDir, name, type, region }) {
    const flyCmd = (await isInstalled('fly')) ? 'fly' : 'flyctl';
    const appName = sanitizeName(name);

    // Ensure fly.toml exists
    if (!existsSync(join(projectDir, 'fly.toml'))) {
      generateFlyToml(projectDir, appName, type, region);
    }

    // Ensure Dockerfile exists for Python projects
    if ((type === 'fastapi' || type === 'flask' || type === 'python') &&
        !existsSync(join(projectDir, 'Dockerfile'))) {
      generateDockerfile(projectDir, type);
    }

    const spinner = ora('Deploying to Fly.io...').start();

    try {
      // Try to create the app (ignore error if it already exists)
      try {
        await execa(flyCmd, ['apps', 'create', appName, '--machines'], {
          cwd: projectDir,
          stdio: 'pipe',
        });
      } catch {
        // App might already exist — that's fine
      }

      const { stdout } = await execa(flyCmd, ['deploy', '--now'], {
        cwd: projectDir,
        stdio: 'pipe',
      });

      spinner.succeed('Deployed to Fly.io');

      const url = extractUrl(stdout, appName);
      return url;
    } catch (error) {
      spinner.fail('Fly.io deployment failed');
      throw new Error(
        `Deployment failed: ${error.stderr || error.message}\n\n` +
        `Make sure you're logged in: ${chalk.cyan(`${flyCmd} auth login`)}`
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
    .slice(0, 30);
}

function extractUrl(stdout, appName) {
  const match = stdout.match(/https:\/\/[^\s]+\.fly\.dev/);
  return match ? match[0] : `https://${appName}.fly.dev`;
}

function generateFlyToml(projectDir, appName, type, region) {
  const port = type === 'fastapi' ? 8000 :
               type === 'flask' ? 5000 : 3000;

  const toml = `app = "${appName}"
primary_region = "${region || 'iad'}"

[build]

[http_service]
  internal_port = ${port}
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[vm]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
`;

  writeFileSync(join(projectDir, 'fly.toml'), toml);
}

function generateDockerfile(projectDir, type) {
  let dockerfile;

  if (type === 'fastapi') {
    dockerfile = `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt* ./
RUN pip install --no-cache-dir -r requirements.txt 2>/dev/null || pip install fastapi uvicorn
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`;
  } else if (type === 'flask') {
    dockerfile = `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt* ./
RUN pip install --no-cache-dir -r requirements.txt 2>/dev/null || pip install flask gunicorn
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
`;
  } else {
    dockerfile = `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt* ./
RUN pip install --no-cache-dir -r requirements.txt 2>/dev/null || true
COPY . .
EXPOSE 8000
CMD ["python", "main.py"]
`;
  }

  writeFileSync(join(projectDir, 'Dockerfile'), dockerfile);
}
