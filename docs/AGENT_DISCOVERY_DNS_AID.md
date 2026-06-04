# DNS-AID setup for seminai.tech

Use this checklist in Cloudflare DNS after the frontend discovery headers and
Markdown negotiation Worker are deployed.

## Required endpoints

- Site index: `https://seminai.tech/.well-known/api-catalog`
- Agent skills: `https://seminai.tech/.well-known/agent-skills/index.json`
- API catalog: `https://seminai-be-v2-661301438659.europe-west1.run.app/.well-known/api-catalog`
- OpenAPI: `https://seminai-be-v2-661301438659.europe-west1.run.app/openapi.json`

## DNS-AID records

Create HTTPS records under the public zone. Keep capability endpoints in TXT
fallbacks because Cloudflare supports standard SVCB/HTTPS parameters, while
DNS-AID custom parameters are still draft-stage and provider support varies.

### Preferred SVCB/HTTPS records

```text
_index._agents.seminai.tech. 300 IN HTTPS 1 seminai.tech. alpn="h2,h3" port=443 mandatory="alpn,port"
_a2a._agents.seminai.tech. 300 IN HTTPS 1 seminai.tech. alpn="h2,h3" port=443 mandatory="alpn,port"
```

Add this only after a real MCP endpoint exists:

```text
_mcp._agents.seminai.tech. 300 IN HTTPS 1 seminai-be-v2-661301438659.europe-west1.run.app. alpn="h2" port=443 mandatory="alpn,port"
```

### TXT fallbacks

```text
_index._agents.seminai.tech. 300 IN TXT "endpoint=https://seminai.tech/.well-known/api-catalog"
_a2a._agents.seminai.tech. 300 IN TXT "endpoint=https://seminai.tech/.well-known/agent-skills/index.json"
```

## DNSSEC

Enable DNSSEC in Cloudflare for `seminai.tech` and publish the DS record at the registrar. The scanner should then receive authenticated DNS responses with `AD=true` from validating resolvers.

## Verification

```bash
dig HTTPS _index._agents.seminai.tech
dig HTTPS _a2a._agents.seminai.tech
dig TXT _index._agents.seminai.tech
dig TXT _a2a._agents.seminai.tech
```
