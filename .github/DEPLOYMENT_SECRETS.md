# GitHub Actions Secrets

Add these in GitHub:

`Settings -> Secrets and variables -> Actions -> New repository secret`

## Required for production deploy

- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`
- `SERVER_PORT`
- `SERVER_APP_PATH`

## Required by the application build/runtime

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_INSFORGE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `INSFORGE_URL`
- `INSFORGE_ANON_KEY`
- `INSFORGE_SERVICE_ROLE_KEY`
- `TEMPORAL_ADDRESS`
- `TEMPORAL_NAMESPACE`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SMS_PROVIDER`
- `SMS_FALLBACK_PROVIDER`
- `VENDEL_API_URL`
- `VENDEL_API_KEY`
- `VENDEL_DEVICE_ID`
- `TEXTBEE_API_URL`
- `TEXTBEE_API_KEY`
- `TEXTBEE_DEVICE_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## GitHub CLI commands

If the GitHub CLI is installed and authenticated:

```bash
gh secret set SERVER_HOST
gh secret set SERVER_USER
gh secret set SERVER_SSH_KEY
gh secret set SERVER_PORT
gh secret set SERVER_APP_PATH

gh secret set NEXT_PUBLIC_APP_URL
gh secret set NEXT_PUBLIC_INSFORGE_URL
gh secret set NEXT_PUBLIC_INSFORGE_ANON_KEY
gh secret set INSFORGE_URL
gh secret set INSFORGE_ANON_KEY
gh secret set INSFORGE_SERVICE_ROLE_KEY
gh secret set TEMPORAL_ADDRESS
gh secret set TEMPORAL_NAMESPACE
gh secret set RESEND_API_KEY
gh secret set RESEND_FROM_EMAIL
gh secret set SMS_PROVIDER
gh secret set SMS_FALLBACK_PROVIDER
gh secret set VENDEL_API_URL
gh secret set VENDEL_API_KEY
gh secret set VENDEL_DEVICE_ID
gh secret set TEXTBEE_API_URL
gh secret set TEXTBEE_API_KEY
gh secret set TEXTBEE_DEVICE_ID
gh secret set STRIPE_SECRET_KEY
gh secret set STRIPE_WEBHOOK_SECRET
gh secret set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

Keep production `.env.local` on the server. Do not commit real secret values.
