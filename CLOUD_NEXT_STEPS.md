# ContextKit Cloud — Next Steps for Jo

## Accounts to Create

### 1. Clerk Account
- **URL:** https://clerk.com
- **Action:** Create application → Get Publishable Key + Secret Key
- **Free tier:** 10,000 MAU

### 2. Turso Account  
- **URL:** https://turso.tech
- **Action:** Create database "contextkit" → Get URL + Auth Token
- **Free tier:** 9GB storage

### 3. Cloudflare Account
- **URL:** https://cloudflare.com
- **Action:** Workers & R2 access (may already have)
- **Free tier:** 100k requests/day, 10GB R2

### 4. Domain
- **Option A:** Register contextkit.dev (~$12/year)
- **Option B:** Use subdomain of existing domain

---

## Once You Have Keys

Give me:
```
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
TURSO_URL=libsql://contextkit-xxx.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

Then I will:
1. Set Wrangler secrets
2. Deploy database schema
3. Deploy API to Cloudflare Workers
4. Build CLI `contextkit login` and `contextkit sync`

---

## Cost Summary

| Service | Free Tier | When We Pay |
|---------|-----------|-------------|
| Cloudflare Workers | 100k req/day | Never (at our scale) |
| Clerk | 10k MAU | >10k users |
| Turso | 9GB | >9GB data |
| R2 | 10GB | >10GB storage |
| **Total** | **$0/month** | Scales with success |

---

*Created: 2026-02-08*
