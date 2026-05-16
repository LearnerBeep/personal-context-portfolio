---
layout: default
title: Personal Context Portfolio
---

# Personal Context Portfolio

Welcome. This repository is now deployable as a static documentation site and also includes:

- A browser-based interviewer web app (`/webapp`)
- An MCP resource server implementation (`/mcp/server.js`)

## Quick Links

- [Getting Started](GETTING-STARTED.html)
- [Templates](templates/identity.html)
- [Examples: Knowledge Worker](examples/knowledge-worker/identity.html)
- [Examples: Executive](examples/executive/identity.html)
- [Examples: Entrepreneur](examples/entrepreneur/identity.html)
- [Wiring: MCP Resource](wiring/mcp-resource.html)
- [Interviewer Agent Protocol](interview-protocol/agent-system-prompt.html)
- [Web App](webapp/)

## Deployment and Runtime Options

- **Option A (static site):** GitHub Pages workflow in `.github/workflows/deploy-pages.yml`
- **Option B (web app):** Browser app in `webapp/` using OpenAI-compatible chat completions
- **Option C (MCP resource):** Stdio MCP server in `mcp/server.js`
