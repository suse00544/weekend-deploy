import { cloudflare } from './cloudflare.js';
import { vercel } from './vercel.js';
import { netlify } from './netlify.js';
import { fly } from './fly.js';
import * as githubPages from './github-pages.js';

/**
 * Platform registry.
 */
export const platforms = {
  cloudflare,
  vercel,
  netlify,
  fly,
  'github-pages': githubPages,
};

/**
 * Platform selection rules based on project type and category.
 * Returns a prioritized list of platform keys.
 *
 * @param {import('../detect.js').ProjectInfo} project
 * @returns {string[]} - Ordered list of platform keys to try
 */
export function selectPlatforms(project) {
  switch (project.type) {
    case 'nextjs':
    case 'nuxt':
    case 'svelte':
    case 'astro':
      // Framework-aware hosts first
      return ['vercel', 'netlify', 'cloudflare'];

    case 'vite':
    case 'react-cra':
    case 'vue':
      // Static build output — Cloudflare Pages is fastest
      return ['cloudflare', 'vercel', 'netlify'];

    case 'static':
      // Pure static — Cloudflare Pages, GitHub Pages, or Netlify
      return ['cloudflare', 'github-pages', 'netlify', 'vercel'];

    case 'express':
    case 'node':
    case 'fastapi':
    case 'flask':
    case 'python':
      // Backend needs a container/VM host
      return ['fly', 'vercel'];

    default:
      return ['vercel', 'cloudflare', 'netlify', 'fly'];
  }
}

/**
 * Find the first available platform from the priority list.
 * @param {string[]} priorities - Platform keys in priority order
 * @returns {Promise<{key: string, platform: object}|null>}
 */
export async function findAvailablePlatform(priorities) {
  for (const key of priorities) {
    const platform = platforms[key];
    if (platform && await platform.isAvailable()) {
      return { key, platform };
    }
  }
  return null;
}

/**
 * Get install hints for all platforms in the priority list.
 * @param {string[]} priorities
 * @returns {string[]}
 */
export function getInstallHints(priorities) {
  return priorities
    .map(key => platforms[key])
    .filter(Boolean)
    .map(p => `  ${p.name}: ${p.installHint}`);
}
