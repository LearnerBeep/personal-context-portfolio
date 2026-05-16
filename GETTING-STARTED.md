# Getting Started

Two paths to building your personal context portfolio. Pick whichever fits.

---

## Path 1: Use the Web App

The fastest way. A purpose-built interviewer agent handles the whole process.

1. Run a local static server from the repo root (for example: `python3 -m http.server 8000`).
2. Open `http://localhost:8000/webapp/`.
3. Enter your OpenAI-compatible base URL, model, and API key.
4. The interviewer agent starts and works through your portfolio in chat.
5. Save drafted files as you go.
6. Download your complete portfolio as a zip.

The whole thing takes 30-60 minutes if you do it in one sitting. Most people spread it across a few sessions.

---

## Path 2: Do It Yourself

Fork this repo and work through the templates with your own AI build partner (Claude, ChatGPT, or whatever you use).

1. Fork or clone this repo.
2. Open any template file from `/templates`.
3. Copy the entire file and paste it to your AI build partner.
4. Say "let's do this one."
5. Your build partner will read the interview protocol embedded in the template and start asking you questions.
6. When it has enough, it'll draft the file. Read the draft and tell it what's wrong.
7. Save the final version. Move to the next template.

**Recommended order:** Start with `identity.md` and `role-and-responsibilities.md`. Everything else builds on those two. After that, the order matters less — go with whatever feels most relevant to your work right now.

**Suggested full sequence:**

1. `identity.md`
2. `role-and-responsibilities.md`
3. `current-projects.md`
4. `team-and-relationships.md`
5. `tools-and-systems.md`
6. `communication-style.md`
7. `goals-and-priorities.md`
8. `preferences-and-constraints.md`
9. `domain-knowledge.md`
10. `decision-log.md`

---

## After You Build It

Your portfolio is a set of markdown files. That's the point — they're portable. But they don't do anything until you wire them into the tools you actually use.

The `/wiring` directory has guides for:

- Exposing your portfolio as an MCP resource
- Using it in Claude Projects
- Connecting it to OpenClaw agents
- Copy-paste patterns for system prompts
- Building an API layer

This is the part that turns your portfolio from "a nice set of documents" into actual infrastructure. Start with whatever tool you use most.

---

## Tips

- **Be specific, not aspirational.** The portfolio should describe how you actually work, not how you wish you worked. Your agents need ground truth.
- **Don't skip the reaction pass.** When your build partner drafts a file, read it and find what's wrong. The corrections are where the real signal is. A rubber-stamped draft is a mediocre file.
- **Short is better than long.** A good context file is one page, not five. Agents perform better with dense, high-signal context than with sprawling documents.
- **Update regularly.** Projects change, priorities shift, you learn new tools. A portfolio that's six months stale is worse than no portfolio — it gives your agents confident but wrong context.


---

## Implementation in This Repository

This repository now includes all three wiring/deployment options:

- **Option A (Static docs site):** `_config.yml`, `index.md`, and `.github/workflows/deploy-pages.yml`
- **Option B (Interviewer web app):** `webapp/index.html`, `webapp/app.js`, `webapp/styles.css`
- **Option C (MCP resource server):** `mcp/server.js`

### Quick Run Commands

From the repo root (an absolute path like `/absolute/path/to/personal-context-portfolio`):

```bash
# Serve the docs + web app locally
python3 -m http.server 8000

# Run MCP server over stdio
REPO_ROOT=/absolute/path/to/personal-context-portfolio
node mcp/server.js --root \"$REPO_ROOT\"
```
