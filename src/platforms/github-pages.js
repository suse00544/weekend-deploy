import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { runCommand, checkCli, printSuccess } from '../utils.js';

export const name = 'GitHub Pages';
export const cliName = 'gh';
export const supportedTypes = ['static', 'vite', 'react-cra', 'vue'];

export async function isAvailable() {
  return checkCli('gh');
}

export async function deploy(projectDir, projectInfo) {
  const outputDir = projectInfo.outputDir || '.';
  const fullOutputDir = join(projectDir, outputDir);

  if (projectInfo.buildCommand) {
    await runCommand('npm', ['run', 'build'], { cwd: projectDir, label: 'Building project' });
  }

  if (!existsSync(fullOutputDir)) {
    throw new Error(`Output directory "${outputDir}" not found after build.`);
  }

  const repoUrl = await getRepoUrl(projectDir);
  if (!repoUrl) {
    await runCommand('gh', ['repo', 'create', '--public', '--source', '.', '--push'], {
      cwd: projectDir,
      label: 'Creating GitHub repo',
    });
  }

  await runCommand('git', ['checkout', '--orphan', 'gh-pages'], {
    cwd: fullOutputDir,
    label: 'Creating gh-pages branch',
  });
  await runCommand('git', ['add', '-A'], { cwd: fullOutputDir });
  await runCommand('git', ['commit', '-m', 'Deploy to GitHub Pages'], { cwd: fullOutputDir });
  await runCommand('git', ['push', 'origin', 'gh-pages', '--force'], {
    cwd: fullOutputDir,
    label: 'Pushing to gh-pages',
  });

  const url = await getRepoUrl(projectDir);
  const pagesUrl = url ? url.replace('github.com', 'github.io').replace(/\.git$/, '') : null;

  printSuccess(pagesUrl || 'GitHub Pages (check repo settings)', 'GitHub Pages');
  return pagesUrl;
}

async function getRepoUrl(projectDir) {
  try {
    const { stdout } = await import('node:child_process').then(cp =>
      new Promise((resolve, reject) => {
        const proc = cp.execSync('git remote get-url origin', {
          cwd: projectDir,
          encoding: 'utf-8',
        });
        resolve({ stdout: proc.trim() });
      })
    );
    return stdout;
  } catch {
    return null;
  }
}
