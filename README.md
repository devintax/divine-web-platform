This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
## Coolify staging deploy

A second GitHub Actions workflow now runs on the `staging` branch and can trigger your Coolify staging deployment. Configure one of these sets of GitHub secrets:

- `COOLIFY_API_URL`
- `COOLIFY_API_TOKEN`
- `COOLIFY_APP_ID`

Or for SSH-based deploy:

- `COOLIFY_SSH_HOST`
- `COOLIFY_SSH_USER`
- `COOLIFY_SSH_KEY`
- `COOLIFY_APP_PATH`

If the secrets are configured, the workflow will build the app and then request the Coolify deploy or perform the SSH deploy command automatically.

## Local auto-commit automation

A local watcher script can automatically commit and push changes to `main` only when the code is clean.

Run it from the repo root with:

```bash
npm run auto:commit
```

It will:
- watch source files and repo config files
- run `npm run lint`
- run `npm run build`
- commit and push only if both checks pass
- only operate on `main`

Use this only on a trusted development machine, because it will push commits automatically when code is clean.
