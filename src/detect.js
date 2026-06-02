import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @typedef {object} ProjectInfo
 * @property {'static'|'vite'|'nextjs'|'react-cra'|'vue'|'nuxt'|'svelte'|'express'|'fastapi'|'flask'|'python'|'node'} type
 * @property {string} framework - Human-readable framework name
 * @property {'frontend'|'backend'|'static'} category
 * @property {string|null} buildCommand - Detected build command
 * @property {string|null} outputDir - Detected output directory
 */

/**
 * Auto-detect the project type in the given directory.
 * @param {string} projectDir - Absolute path to the project root
 * @returns {ProjectInfo}
 */
export function detectProject(projectDir) {
  // Try package.json-based detection first
  const pkgPath = join(projectDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const result = detectFromPackageJson(pkg, projectDir);
      if (result) return result;
    } catch {
      // Fall through to other detection
    }
  }

  // Python detection
  const pythonResult = detectPython(projectDir);
  if (pythonResult) return pythonResult;

  // Static HTML detection
  if (existsSync(join(projectDir, 'index.html'))) {
    return {
      type: 'static',
      framework: 'Static HTML',
      category: 'static',
      buildCommand: null,
      outputDir: '.',
    };
  }

  // Fallback: check for common files
  const files = readdirSync(projectDir);
  const hasHtml = files.some(f => f.endsWith('.html'));
  if (hasHtml) {
    return {
      type: 'static',
      framework: 'Static HTML',
      category: 'static',
      buildCommand: null,
      outputDir: '.',
    };
  }

  return {
    type: 'node',
    framework: 'Node.js',
    category: 'backend',
    buildCommand: null,
    outputDir: null,
  };
}

/**
 * Detect project type from package.json contents.
 * @param {object} pkg
 * @param {string} projectDir
 * @returns {ProjectInfo|null}
 */
function detectFromPackageJson(pkg, projectDir) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const scripts = pkg.scripts || {};

  // Next.js
  if (deps['next']) {
    return {
      type: 'nextjs',
      framework: 'Next.js',
      category: 'frontend',
      buildCommand: scripts.build || 'next build',
      outputDir: '.next',
    };
  }

  // Nuxt
  if (deps['nuxt'] || deps['nuxt3']) {
    return {
      type: 'nuxt',
      framework: 'Nuxt',
      category: 'frontend',
      buildCommand: scripts.build || 'nuxt build',
      outputDir: '.output',
    };
  }

  // Astro
  if (deps['astro']) {
    return {
      type: 'astro',
      framework: 'Astro',
      category: 'frontend',
      buildCommand: scripts.build || 'astro build',
      outputDir: 'dist',
    };
  }

  // SvelteKit
  if (deps['@sveltejs/kit']) {
    return {
      type: 'svelte',
      framework: 'SvelteKit',
      category: 'frontend',
      buildCommand: scripts.build || 'vite build',
      outputDir: 'build',
    };
  }

  // Vite (generic — check before React/Vue since they often use Vite)
  if (deps['vite']) {
    // Check if it's a React or Vue project using Vite
    const framework = deps['react'] ? 'React + Vite' :
                      deps['vue'] ? 'Vue + Vite' :
                      deps['svelte'] ? 'Svelte + Vite' : 'Vite';
    return {
      type: 'vite',
      framework,
      category: 'frontend',
      buildCommand: scripts.build || 'vite build',
      outputDir: 'dist',
    };
  }

  // Create React App
  if (deps['react-scripts']) {
    return {
      type: 'react-cra',
      framework: 'Create React App',
      category: 'frontend',
      buildCommand: 'react-scripts build',
      outputDir: 'build',
    };
  }

  // Vue CLI
  if (deps['@vue/cli-service']) {
    return {
      type: 'vue',
      framework: 'Vue CLI',
      category: 'frontend',
      buildCommand: 'vue-cli-service build',
      outputDir: 'dist',
    };
  }

  // Express / backend Node.js
  if (deps['express'] || deps['fastify'] || deps['koa'] || deps['hono']) {
    const framework = deps['express'] ? 'Express' :
                      deps['fastify'] ? 'Fastify' :
                      deps['koa'] ? 'Koa' : 'Hono';
    return {
      type: 'express',
      framework,
      category: 'backend',
      buildCommand: scripts.build || null,
      outputDir: null,
    };
  }

  // Generic frontend with build script and dist/build output
  if (scripts.build) {
    const outputDir = existsSync(join(projectDir, 'dist')) ? 'dist' :
                      existsSync(join(projectDir, 'build')) ? 'build' : 'dist';
    return {
      type: 'vite',
      framework: 'Node.js (with build)',
      category: 'frontend',
      buildCommand: scripts.build,
      outputDir,
    };
  }

  return null;
}

/**
 * Detect Python project type.
 * @param {string} projectDir
 * @returns {ProjectInfo|null}
 */
function detectPython(projectDir) {
  const files = readdirSync(projectDir);
  const hasPythonFiles = files.some(f => f.endsWith('.py'));
  if (!hasPythonFiles) return null;

  // Check for requirements.txt or pyproject.toml for framework hints
  const requirementsPath = join(projectDir, 'requirements.txt');
  const pyprojectPath = join(projectDir, 'pyproject.toml');

  let content = '';
  if (existsSync(requirementsPath)) {
    content += readFileSync(requirementsPath, 'utf-8');
  }
  if (existsSync(pyprojectPath)) {
    content += readFileSync(pyprojectPath, 'utf-8');
  }

  // Also scan main Python files for imports
  const mainFiles = ['app.py', 'main.py', 'server.py', 'api.py'];
  for (const f of mainFiles) {
    const fp = join(projectDir, f);
    if (existsSync(fp)) {
      content += readFileSync(fp, 'utf-8');
    }
  }

  if (content.includes('fastapi') || content.includes('FastAPI')) {
    return {
      type: 'fastapi',
      framework: 'FastAPI',
      category: 'backend',
      buildCommand: null,
      outputDir: null,
    };
  }

  if (content.includes('flask') || content.includes('Flask')) {
    return {
      type: 'flask',
      framework: 'Flask',
      category: 'backend',
      buildCommand: null,
      outputDir: null,
    };
  }

  return {
    type: 'python',
    framework: 'Python',
    category: 'backend',
    buildCommand: null,
    outputDir: null,
  };
}
