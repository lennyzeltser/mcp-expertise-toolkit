# MCP Expertise Toolkit

A template for building MCP servers that deliver domain-specific expertise to AI assistants.

## What This Does

This toolkit lets you codify your expertise in a YAML file and serve it through an MCP (Model Context Protocol) server. AI assistants like Claude, Cursor, and others can then query your expertise to provide feedback and guidance.

**This is a template repository.** Fork it, customize it with your expertise, then deploy it.

**Features:**

- **Privacy-preserving**: The server returns guidelines; the AI analyzes content locally. User content never leaves the user's machine.
- **Semantic guidance**: Teaches AI to understand concepts, not match keywords.
- **Token-efficient**: Detail levels let users control response size.
- **Domain-agnostic**: Works for any expertise area—writing, code review, recipes, legal documents, whatever you know well.

## How to Use This Template

### 1. Fork and customize

```bash
git clone https://github.com/YOUR_USERNAME/mcp-expertise-toolkit.git
cd mcp-expertise-toolkit
bun install  # or npm install
```

Edit `content/writing-feedback.yaml` with your own expertise. The included example covers writing feedback—replace it with your domain.

### 2. Validate

```bash
bun run validate
```

This checks your YAML against the schema and reports any issues.

### 3. Deploy

The included configuration targets Cloudflare Workers + R2, but the code runs anywhere that supports JavaScript/TypeScript. See [Deployment Options](#deployment-options) below.

For Cloudflare:

```bash
npx wrangler login
npx wrangler r2 bucket create mcp-expertise-data
npx wrangler r2 object put mcp-expertise-data/expertise.yaml \
  --file content/your-expertise.yaml \
  --content-type "text/yaml"
bun run deploy
```

### 4. Connect your AI assistant

Add to Claude Code settings (`~/.claude/settings.local.json`) or your MCP client config:

```json
{
  "mcpServers": {
    "your-expertise": {
      "command": "npx",
      "args": ["mcp-remote", "https://YOUR-WORKER.workers.dev/mcp"]
    }
  }
}
```

## YAML Schema

The expertise file has these main sections:

```yaml
version: "1.0.0"

meta:
  domain: "Your Domain"
  author: "Your Name"
  description: "What this expertise covers"
  toolPrefix: "yourdomain"  # Creates tools like load_yourdomain_context

principles:
  - name: "Core Principle"
    guidelines:
      - "First guideline"
      - "Second guideline"

checkpoints:
  - id: "section_name"
    name: "Section Name"
    purpose: "Why this matters"
    whatIndicatesPresence:
      - "Concept to look for (semantic, not keyword)"
    commonProblems:
      - "What goes wrong when missing"

qualityChecks:
  issue_type:
    whatToCheck: "What to look for"
    whyItMatters: "Why this matters"
    examples:
      - bad: "Example of the problem"
        good: "How to fix it"

reviewGuidance:
  feedbackStructure:
    - "Start with strengths"
    - "Be specific"
  tone:
    - "Collaborative, not critical"
```

See [docs/schema-reference.md](docs/schema-reference.md) for the complete schema.

## MCP Tools

Based on your `meta.toolPrefix`, the server creates these tools:

| Tool | Purpose |
|------|---------|
| `load_{prefix}_context` | Load expertise context for creating or improving content |
| `review_{prefix}_content` | Get review criteria for critiquing existing content |
| `get_{prefix}_guidelines` | Get formatted guidelines for specific topics |
| `get_capabilities` | List all available tools |

## Key Concepts

### Semantic Guidance

Describe concepts, not keywords. AI understands meaning.

```yaml
# Weak - keyword matching
whatIndicatesPresence:
  - "introduction"
  - "overview"

# Strong - semantic understanding
whatIndicatesPresence:
  - "Clear statement of what the content covers"
  - "Explanation of why the reader should care"
```

### Detail Levels

Control token usage with `detail_level`:

- **minimal**: Core checkpoints only (~2k tokens)
- **standard**: Checkpoints + quality checks + principles (~5k tokens)
- **comprehensive**: Everything including examples (~10k tokens)

## Deployment Options

### Cloudflare Workers + R2 (default)

The included `wrangler.jsonc` configures deployment to Cloudflare Workers with R2 storage. This works on Cloudflare's free tier for most use cases.

### Other platforms

The server is standard JavaScript/TypeScript that runs anywhere. To deploy elsewhere:

1. Replace the R2 storage calls in `src/index.ts` with your storage backend (filesystem, S3, database, etc.)
2. Adapt the HTTP handling for your platform (Express, Hono, Fastify, etc.)
3. The MCP protocol handling uses `@modelcontextprotocol/sdk`, which is platform-agnostic

### Local development

```bash
bun run dev
# Server runs at http://localhost:8787
```

## Privacy and Threat Model

This design keeps user content local. Here's how it works:

**What the server does:**
- Stores and serves your expertise (YAML)
- Returns guidelines, checkpoints, and review criteria
- Caches content for performance

**What the server does NOT do:**
- Receive user content
- Store any user data
- Track queries or usage

**The privacy model:**
1. AI assistant calls the server to get expertise/guidelines
2. Server returns guidelines (your domain knowledge)
3. AI analyzes the user's content locally using those guidelines
4. User's content never leaves their machine

**Trust boundaries:**
- The expertise content is public—anyone who knows the URL can query it
- Consider what you put in the YAML; treat it as public documentation
- The server operator (you) sees only tool requests, not user content
- If you add authentication, update the threat model accordingly

**Limitations:**
- Server logs may contain query parameters (checkpoint IDs, topic names)
- If you embed sensitive information in the expertise YAML, it's exposed to anyone with the URL
- The AI assistant making the request is trusted to not leak user content

## Documentation

- [Schema Reference](docs/schema-reference.md) — Complete YAML format
- [Deployment Guide](docs/deployment-guide.md) — Cloudflare setup details

## MCP vs. Claude Code Skills

| Aspect | MCP Server | Claude Code Skills |
|--------|------------|-------------------|
| Works with | Any MCP client | Claude Code only |
| Updates | Deploy to server | Sync local files |
| Best for | Teams, shared expertise | Personal workflows |

Use MCP when you want expertise accessible from multiple tools or shared across a team.

## Author

Created by [Lenny Zeltser](https://zeltser.com).
