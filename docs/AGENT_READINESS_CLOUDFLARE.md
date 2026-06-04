# Agent readiness Cloudflare setup

`seminai.tech` is currently served by GitHub Pages. GitHub Pages does not let us
set arbitrary response headers or content negotiation, so Cloudflare must proxy
the domain and run `seminai-agent-readiness` on the edge.

## 1. Enable Cloudflare proxy

In Cloudflare DNS for `seminai.tech`:

- Set the apex `A` records that point to GitHub Pages to proxied.
- Set `www.seminai.tech` to proxied.
- Keep GitHub Pages as the origin; do not change the GitHub Pages custom domain.

## 2. Deploy the Worker

Authenticate with an account that can edit the `seminai.tech` zone, then run:

```bash
npx wrangler deploy --config wrangler.toml
```

The Worker route configuration is in `wrangler.toml` and applies to:

- `seminai.tech/*`
- `www.seminai.tech/*`

## 3. Publish DNS-AID records

Create these Cloudflare DNS records:

```text
_index._agents.seminai.tech. 300 IN HTTPS 1 seminai.tech. alpn="h2,h3" port=443 mandatory="alpn,port"
_a2a._agents.seminai.tech.   300 IN HTTPS 1 seminai.tech. alpn="h2,h3" port=443 mandatory="alpn,port"

_index._agents.seminai.tech. 300 IN TXT "endpoint=https://seminai.tech/.well-known/api-catalog"
_a2a._agents.seminai.tech.   300 IN TXT "endpoint=https://seminai.tech/.well-known/agent-skills/index.json"
```

Enable DNSSEC in Cloudflare and publish the generated DS record at the domain
registrar.

## 4. Purge and verify

Purge Cloudflare cache for:

- `https://seminai.tech/`
- `https://seminai.tech/index.html`
- `https://seminai.tech/.well-known/api-catalog`

Then verify:

```bash
curl -I https://seminai.tech/
curl -s -D - -H 'Accept: text/markdown' https://seminai.tech/ -o /tmp/seminai-home.md
curl -I https://seminai.tech/.well-known/api-catalog
dig HTTPS _index._agents.seminai.tech
dig HTTPS _a2a._agents.seminai.tech
dig TXT _index._agents.seminai.tech
dig TXT _a2a._agents.seminai.tech
```

Expected results:

- `GET /` and `HEAD /` include a `Link` header.
- `Accept: text/markdown` on `/` returns `Content-Type: text/markdown; charset=utf-8`.
- `/.well-known/api-catalog` returns `Content-Type: application/linkset+json; charset=utf-8`.
- DNS queries return HTTPS and TXT answers for `_index` and `_a2a`.
