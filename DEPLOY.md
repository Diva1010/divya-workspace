# Deploying to Vercel

The site is a static Vite build. Settings (detected automatically from the repository):

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install` (default)

Headers, caching and clean URLs are configured in `vercel.json`. `public/404.html` is served for unknown paths.

## Deploy from the command line

```bash
npx vercel login      # once
npx vercel            # preview deployment
npx vercel --prod     # production deployment
```

A CLI deploy uploads this folder and honours `.vercelignore`, so large source assets and other local-only files are not uploaded. The build runs on Vercel with `npm run build`.

## Deploy from GitHub instead

1. Push the repository to GitHub.
2. In the Vercel dashboard choose Add New, then Project, then import the repository.
3. Confirm the Vite preset, build command `npm run build` and output `dist`, then deploy. Every push to the main branch deploys to production; other branches and pull requests get preview URLs.

## Custom domain

In the project on Vercel open Settings, then Domains, add the domain, and create the DNS record Vercel shows (an A record for an apex domain, a CNAME for a subdomain). HTTPS is issued automatically.
