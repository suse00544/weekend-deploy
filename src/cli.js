#!/usr/bin/env node

import { resolve, basename } from 'node:path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { execa } from 'execa';
import { detectProject } from './detect.js';
import { readConfig } from './config.js';
import { selectPlatforms, findAvailablePlatform, platforms, getInstallHints } from './platforms/index.js';
import { ensureGitRepo, fatal, printSuccess } from './utils.js';

const VERSION = '0.1.0';

async function main() {
  const args = process.argv.slice(2);

  // Handle flags
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`weekend-deploy v${VERSION}`);
    process.exit(0);
  }

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run') || args.includes('-d');

  // Banner
  console.log('');
  console.log(chalk.bold.cyan('  weekend-deploy'));
  console.log(chalk.dim('  Deploy your weekend project in 30 seconds.'));
  console.log('');

  // Determine project directory
  const projectDir = resolve(args[0] || '.');
  const projectName = basename(projectDir);

  // Read optional config
  const config = readConfig(projectDir);

  // Step 1: Detect project type
  const detectSpinner = ora('Detecting project type...').start();
  const project = detectProject(projectDir);
  detectSpinner.succeed(
    `Detected: ${chalk.bold(project.framework)} ${chalk.dim(`(${project.category})`)}`
  );

  // Step 2: Select platform
  let platformKey;
  let platform;

  if (config.platform) {
    // User forced a platform via deploy.yaml
    platformKey = config.platform;
    platform = platforms[platformKey];
    if (!platform) {
      fatal(`Unknown platform "${config.platform}" in deploy.yaml. Available: cloudflare, vercel, netlify, fly`);
    }
    if (!(await platform.isAvailable())) {
      fatal(
        `Platform "${config.platform}" selected in deploy.yaml, but CLI not found.\n` +
        `  Install it: ${platform.installHint}`
      );
    }
  } else {
    // Auto-select based on project type
    const priorities = selectPlatforms(project);
    const found = await findAvailablePlatform(priorities);

    if (!found) {
      console.log('');
      console.log(chalk.yellow('  No supported deployment CLI found. Install one of:'));
      console.log('');
      getInstallHints(priorities).forEach(hint => console.log(hint));
      console.log('');
      process.exit(1);
    }

    platformKey = found.key;
    platform = found.platform;
  }

  console.log(chalk.dim(`  Platform: ${platform.name}`));

  // Dry run: show what would happen, then exit
  if (dryRun) {
    console.log('');
    console.log(chalk.yellow('  --- DRY RUN ---'));
    console.log(`  Project:    ${projectName}`);
    console.log(`  Type:       ${project.framework} (${project.category})`);
    console.log(`  Platform:   ${platform.name}`);
    console.log(`  Build:      ${buildCommand || 'none'}`);
    console.log(`  Output dir: ${config.outputDir || project.outputDir || '.'}`);
    console.log(chalk.yellow('  No deployment performed.'));
    console.log('');
    process.exit(0);
  }

  // Step 3: Build (if needed)
  const buildCommand = config.buildCommand || project.buildCommand;
  if (buildCommand) {
    const buildSpinner = ora(`Building project...`).start();
    try {
      await execa('npm', ['run', 'build'], {
        cwd: projectDir,
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' },
      });
      buildSpinner.succeed('Build complete');
    } catch (error) {
      // Try the raw build command if npm run build fails
      try {
        const [cmd, ...cmdArgs] = buildCommand.split(' ');
        await execa(cmd, cmdArgs, {
          cwd: projectDir,
          stdio: 'pipe',
          env: { ...process.env, NODE_ENV: 'production' },
        });
        buildSpinner.succeed('Build complete');
      } catch (buildError) {
        buildSpinner.fail('Build failed');
        console.error(chalk.red(`\n  ${buildError.stderr || buildError.message}\n`));
        process.exit(1);
      }
    }
  }

  // Step 4: Ensure git repo (some platforms require it)
  if (platformKey === 'fly') {
    await ensureGitRepo(projectDir);
  }

  // Step 5: Deploy
  const name = config.name || projectName;
  const outputDir = config.outputDir || project.outputDir;

  try {
    const url = await platform.deploy({
      projectDir,
      outputDir,
      name,
      type: project.type,
      region: config.region,
      prod: true,
    });

    printSuccess(url, platform.name);

    // Optionally open in browser
    if (args.includes('--open') || args.includes('-o')) {
      const openCmd = process.platform === 'darwin' ? 'open' :
                      process.platform === 'win32' ? 'start' : 'xdg-open';
      await execa(openCmd, [url]).catch(() => {});
    }
  } catch (error) {
    console.error(chalk.red(`\n  ${error.message}\n`));
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
${chalk.bold('weekend-deploy')} - Deploy your weekend project in 30 seconds.

${chalk.bold('USAGE')}
  npx weekend-deploy [directory] [options]

${chalk.bold('OPTIONS')}
  -h, --help       Show this help message
  -v, --version    Show version
  -o, --open       Open deployed URL in browser
  -d, --dry-run    Show what would happen without actually deploying

${chalk.bold('CONFIGURATION')}
  Create a deploy.yaml in your project root:

    platform: vercel     # Force a specific platform
    name: my-app         # Custom project name
    build: npm run build # Custom build command
    output: dist         # Build output directory
    region: iad          # Deployment region (Fly.io)

${chalk.bold('SUPPORTED PLATFORMS')}
  cloudflare      Cloudflare Pages (static sites, SPAs)
  vercel          Vercel (Next.js, frontend frameworks)
  netlify         Netlify (static sites, SPAs)
  fly             Fly.io (backend: Node.js, Python)
  github-pages    GitHub Pages (static sites, docs)

${chalk.bold('EXAMPLES')}
  npx weekend-deploy              # Deploy current directory
  npx weekend-deploy ./my-app     # Deploy specific directory
  npx weekend-deploy --open       # Deploy and open in browser
  npx weekend-deploy --dry-run    # Preview without deploying
`);
}

main().catch((error) => {
  console.error(chalk.red(`\n  Unexpected error: ${error.message}\n`));
  process.exit(1);
});
