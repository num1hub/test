<!-- @anchor doc:ops.deploy-vercel-hobby links=doc:n1hub.readme,interface:api.deploy-smoke note="Step-by-step deploy checklist for the locked single-owner Vercel Hobby posture." -->
# Vercel Hobby Deploy Checklist

This is the bounded deploy checklist for the locked single-owner N1Hub posture.

## Required Env

- `N1HUB_AUTH_SECRET`
- `N1HUB_OWNER_LOGIN`
- `VAULT_PASSWORD`
- `N1HUB_ACCESS_CODE`
- `N1HUB_OWNER_ROUTE_SEGMENT`

Reference template:

- [ops/env/n1hub-vercel-hobby.env.example](/home/n1/n1hub.com/ops/env/n1hub-vercel-hobby.env.example)

## Local Preflight

Run:

```bash
npm run deploy:vercel:hobby:check
```

Expected outcome:

- `status: ready`
- printed owner route
- listed smoke checks

## Vercel Rollout Order

1. Create the Vercel project.
2. Add the required env values.
3. Deploy.
4. Visit `/`.
5. Visit `/api/deploy/smoke`.
6. Visit `/architect-gate/<N1HUB_OWNER_ROUTE_SEGMENT>`.
7. Verify an unauthenticated visit to `/vault` redirects to `/`.

## Smoke Success Criteria

- `/` renders the locked access gate
- `/api/deploy/smoke` returns `200` with `"ok": true`
- owner route renders the login form
- protected pages remain gated without a session
- `/api/auth` fails closed with `503` if deploy auth env is incomplete
