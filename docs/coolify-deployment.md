# Divine Financial Group Coolify Deployment

This project deploys to Coolify as a Docker Compose application.

## Services

- `dfg-web`: Next.js production server on port `3000`
- `dfg-worker`: Temporal worker for all DFG task queues
- `dfg-temporal`: Temporal server on port `7233`
- `dfg-temporal-db`: Postgres backing Temporal
- `dfg-temporal-ui`: optional Temporal UI on port `8080`
- `cloudflared`: optional Cloudflare Tunnel runner for `web.dfgworld.net`

The platform depends on existing hosted services:

- InsForge: `https://insforge.dfgworld.net`
- Dograh: `https://dograh.dfgworld.net`
- LiteLLM AI gateway: `https://ai.dfgworld.net/v1`
- TextBee: `https://api-textbee.dfgworld.net`
- Vendel: `https://api-vendel.dfgworld.net`
- DocuSeal: `https://sign.dfgworld.net`
- Stirling-PDF: `https://pdf.dfgworld.net`
- Cal.com: `https://cal.dfgworld.net/divine-financial-group`

## Coolify Setup

Create a Docker Compose resource in Coolify:

- Repository: `https://github.com/devintax/divine-web-platform.git`
- Branch: `main`
- Compose file: `docker-compose.coolify.yml`
- Public domain: `https://web.dfgworld.net`
- Health check path: `/api/health`

## Required Environment Variables

Set these in Coolify. Do not commit real values.

```env
NEXT_PUBLIC_APP_URL=https://web.dfgworld.net
NODE_ENV=production

NEXT_PUBLIC_INSFORGE_URL=https://insforge.dfgworld.net
NEXT_PUBLIC_INSFORGE_ANON_KEY=
INSFORGE_URL=https://insforge.dfgworld.net
INSFORGE_ANON_KEY=
INSFORGE_SERVICE_KEY=

SESSION_SECRET=

NEXT_PUBLIC_CAL_COM_URL=https://cal.dfgworld.net/divine-financial-group
NEXT_PUBLIC_DOCUSEAL_URL=https://sign.dfgworld.net
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

AI_ENABLED=true
AI_BASE_URL=https://ai.dfgworld.net/v1
AI_MODEL=ollama/phi3.5
AI_TIMEOUT_MS=15000
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
LITELLM_MASTER_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=

DOGRAH_BASE_URL=https://dograh.dfgworld.net
DOGRAH_API_KEY=
DOGRAH_AGENT_ID=
DOGRAH_TRIGGER_NODE_ID=
DOGRAH_TRIGGER_MODE=production
DOGRAH_TELEPHONY_CONFIG_ID=
DOGRAH_WEBHOOK_SECRET=

TELNYX_API_KEY=
TELNYX_PUBLIC_KEY=
TELNYX_APP_ID=
TELNYX_AI_ASSISTANT_ID=
TELNYX_PHONE_NUMBER=
DFG_PHONE_NUMBER=

SMS_PROVIDER=textbee
TEXTBEE_API_URL=https://api-textbee.dfgworld.net
TEXTBEE_API_KEY=
TEXTBEE_DEVICE_ID=
VENDEL_API_URL=https://api-vendel.dfgworld.net
VENDEL_API_KEY=
VENDEL_DEVICE_ID=

DOCUSEAL_URL=https://sign.dfgworld.net
DOCUSEAL_API_KEY=
DOCUSEAL_WEBHOOK_SECRET=

STIRLING_PDF_URL=https://pdf.dfgworld.net
STIRLING_PDF_API_KEY=

MAIL_HOST=mail.infomaniak.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=
MAIL_PASS=
MAIL_FROM=
MAIL_REPLY_TO=
ADMIN_EMAIL=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

TEMPORAL_DB_PASSWORD=
TEMPORAL_NAMESPACE=divine-financial
TEMPORAL_TASK_QUEUE_PREFIX=dfg

CLOUDFLARE_TUNNEL_TOKEN=
E2E_TEST_TOKEN=
```

Generate strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Post-Deploy Verification

```bash
curl -s https://web.dfgworld.net/api/health
curl -s -o /dev/null -w "%{http_code}\n" https://web.dfgworld.net/login
curl -s -o /dev/null -w "%{http_code}\n" https://web.dfgworld.net/portal/dashboard
NEXT_PUBLIC_APP_URL=https://web.dfgworld.net npm run e2e:lifecycle
```

Expected:

- `/api/health` returns healthy JSON
- `/login` returns `200`
- unauthenticated `/portal/dashboard` redirects to login
- lifecycle test passes against the deployed URL
