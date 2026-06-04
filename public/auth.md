# Seminai Auth Metadata

Seminai currently supports human user authentication through the web application at https://app.seminai.tech/login.

## Authentication model

- Public marketing content on https://seminai.tech/ does not require authentication.
- The application uses user login for protected product features.
- Backend APIs are protected with application credentials such as secure session cookies and bearer tokens.
- Seminai does not currently provide anonymous agent registration for third-party agents.

## Agent guidance

Agents may read public content from:

- https://seminai.tech/llms.txt
- https://seminai.tech/llms-full.txt
- https://seminai.tech/sitemap.xml
- https://seminai.tech/.well-known/api-catalog
- https://seminai.tech/.well-known/agent-skills/index.json

Agents that need protected user data must direct the user to authenticate in the Seminai app and must not attempt credential collection through this site.

## Contact

For API access or integration requests, contact info@seminai.tech.
