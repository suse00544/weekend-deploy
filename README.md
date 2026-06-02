# weekend-deploy

[![npm version](https://img.shields.io/npm/v/weekend-deploy.svg)](https://www.npmjs.com/package/weekend-deploy)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

**Deploy your weekend project in 30 seconds.** Auto-detects project type, picks the best free platform, and ships it.

```
    Code       Detect      Build       Deploy       URL
     |           |           |           |           |
   [*.js]  --> [Vite?]  --> [npm]  --> [Cloud]  --> live!
   [*.py]      [Next?]      [pip]      [Fly.io]
   [*.html]    [Flask?]     [---]      [Vercel]
```

---

## Why?

You built something cool on a Saturday afternoon. Now you want to show it to someone. But deploying means:

- Reading platform docs for 15 minutes
- Installing a CLI
- Figuring out the right command
- Debugging config files

**weekend-deploy** skips all that. One command. One URL. Done.

---

## Quick Start

```bash
npx weekend-deploy
```

That's it. Run it in your project directory and get a live URL.

---

## How It Works

1. **Detect** - Reads your `package.json`, checks for framework markers (`next`, `vite`, `express`, etc.), scans for Python files and `requirements.txt`
2. **Select** - Picks the best free-tier platform for your project type
3. **Build** - Runs your build command (if any)
4. **Deploy** - Ships it using the platform's CLI
5. **URL** - Prints your live URL

---

## Supported Project Types

| Type | Detection | Default Platform |
|------|-----------|-----------------|
| Static HTML | `index.html` in root | Cloudflare Pages |
| Vite / React / Vue | `vite` in dependencies | Cloudflare Pages |
| Next.js | `next` in dependencies | Vercel |
| Nuxt | `nuxt` in dependencies | Vercel |
| SvelteKit | `@sveltejs/kit` in dependencies | Vercel |
| Astro | `astro` in dependencies | Vercel |
| Create React App | `react-scripts` in dependencies | Cloudflare Pages |
| Express / Fastify / Koa | Server framework in dependencies | Fly.io |
| FastAPI | `fastapi` in requirements.txt or imports | Fly.io |
| Flask | `flask` in requirements.txt or imports | Fly.io |

---

## Platform Selection Logic

```
Is it a static site or SPA?
  --> Cloudflare Pages (fastest, generous free tier)

Is it a framework with SSR (Next.js, Nuxt, SvelteKit)?
  --> Vercel (best framework support)

Is it a backend server (Express, FastAPI, Flask)?
  --> Fly.io (free tier with container support)

Is preferred platform CLI not installed?
  --> Try the next best option
```

---

## Configuration

Create a `deploy.yaml` in your project root to customize behavior:

```yaml
# Force a specific platform (overrides auto-detection)
platform: vercel

# Custom project name (used in the deployed URL)
name: my-cool-app

# Custom build command (overrides detected build script)
build: npm run build:prod

# Build output directory (overrides framework defaults)
output: dist

# Deployment region (Fly.io)
region: lax

# Environment variables
env:
  NODE_ENV: production
  API_URL: https://api.example.com
```

All fields are optional. Without `deploy.yaml`, everything is auto-detected.

---

## Examples

### Static HTML site

```bash
# You have: index.html, style.css, script.js
npx weekend-deploy
# --> Deploys to Cloudflare Pages
# --> https://my-project.pages.dev
```

### Vite + React app

```bash
# You have: package.json with vite + react
npx weekend-deploy
# --> Runs `npm run build`
# --> Deploys `dist/` to Cloudflare Pages
# --> https://my-react-app.pages.dev
```

### Next.js app

```bash
# You have: package.json with next
npx weekend-deploy
# --> Runs `npm run build`
# --> Deploys to Vercel
# --> https://my-nextjs-app.vercel.app
```

### FastAPI backend

```bash
# You have: main.py with FastAPI, requirements.txt
npx weekend-deploy
# --> Generates Dockerfile + fly.toml
# --> Deploys to Fly.io
# --> https://my-api.fly.dev
```

### Express API

```bash
# You have: package.json with express
npx weekend-deploy
# --> Deploys to Fly.io
# --> https://my-express-app.fly.dev
```

### Deploy a specific directory

```bash
npx weekend-deploy ./apps/frontend
```

### Force a specific platform

```bash
npx weekend-deploy --platform netlify
```

### Deploy and open in browser

```bash
npx weekend-deploy --open
```

---

## CLI Reference

```
weekend-deploy [directory] [options]

Options:
  -h, --help          Show help
  -v, --version       Show version
  -o, --open          Open deployed URL in browser after deploy
  -d, --dry-run       Show what would happen without actually deploying
  --platform NAME     Force a specific platform (skip auto-detection)

Arguments:
  directory           Project directory (defaults to current directory)
```

---

## Prerequisites

You need at least one deployment platform CLI installed and authenticated:

| Platform | Install | Login |
|----------|---------|-------|
| Cloudflare Pages | `npm i -g wrangler` | `wrangler login` |
| Vercel | `npm i -g vercel` | `vercel login` |
| Netlify | `npm i -g netlify-cli` | `netlify login` |
| Fly.io | `curl -L https://fly.io/install.sh \| sh` | `fly auth login` |
| GitHub Pages | `brew install gh` | `gh auth login` |

**weekend-deploy** will automatically use whichever CLI is available. If your preferred platform isn't installed, it gracefully falls back to the next best option.

---

## Contributing

Contributions are welcome! Here's how to get started:

```bash
git clone https://github.com/user/weekend-deploy.git
cd weekend-deploy
npm install
npm link  # makes `weekend-deploy` available globally for testing
```

### Project structure

```
src/
  cli.js              # Main entry point, orchestrates the flow
  detect.js           # Project type detection
  config.js           # deploy.yaml reader
  utils.js            # Helpers (spinners, git, CLI checks)
  platforms/
    index.js          # Platform registry and selection logic
    cloudflare.js     # Cloudflare Pages deployment
    vercel.js         # Vercel deployment
    netlify.js        # Netlify deployment
    fly.js            # Fly.io deployment
    github-pages.js   # GitHub Pages deployment
examples/
  deploy.yaml         # Example configuration file
```

### Adding a new platform

1. Create `src/platforms/yourplatform.js` with the standard interface (`isAvailable`, `deploy`)
2. Register it in `src/platforms/index.js`
3. Add detection rules in `selectPlatforms()`
4. Update this README

---

## Roadmap

- [x] **GitHub Pages** - For documentation and static sites
- [x] **Dry-run mode** - Preview deployment plan without shipping
- [ ] **Railway** - Container deployments with zero config
- [ ] **Deno Deploy** - For Deno/Fresh projects
- [ ] **Render** - Backend alternative to Fly.io
- [ ] **Interactive mode** - Pick platform manually with arrow keys
- [ ] **Deploy previews** - Branch-based preview URLs
- [ ] **Monorepo support** - Deploy specific workspace packages
- [ ] **Custom domains** - Post-deploy domain configuration
- [ ] **Rollback** - `weekend-deploy rollback` to revert

---

## License

MIT
