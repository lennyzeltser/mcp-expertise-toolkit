# MCP Expertise Toolkit

Turn your domain expertise into an AI-accessible knowledge base.

## What This Does

This toolkit lets you codify your expertise in a YAML file and deploy it as an MCP (Model Context Protocol) server. AI assistants like Claude, Cursor, and others can then query your expertise to provide feedback and guidance on content in your domain.

**Key features:**

- **Privacy-preserving**: The server returns guidelines; AI analyzes content locally. User content is never sent to the server.
- **Semantic guidance**: Teaches AI to understand concepts, not match keywords.
- **Token-efficient**: Detail levels let users control response size.
- **Domain-agnostic**: Works for any area of expertise—writing, code review, recipes, legal documents, and more.

## Quick Start

### 1. Fork this repository

```bash
git clone https://github.com/YOUR_USERNAME/mcp-expertise-toolkit.git
cd mcp-expertise-toolkit
bun install
```

### 2. Edit the expertise file

Replace `content/writing-feedback.yaml` with your own expertise. See [Schema Reference](docs/schema-reference.md) for the full format.

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
  - id: "introduction"
    name: "Introduction"
    purpose: "Why this matters"
    whatIndicatesPresence:
      - "Semantic indicator (concept, not keyword)"
    commonProblems:
      - "What goes wrong when this is missing"

reviewGuidance:
  feedbackStructure:
    - "Start with strengths"
    - "Offer specific suggestions"
  tone:
    - "Be collaborative, not critical"
```

### 3. Validate your YAML

```bash
bun run validate
# Or specify a file:
bun scripts/validate-expertise.ts path/to/your-expertise.yaml
```

### 4. Deploy to Cloudflare

```bash
# Create R2 bucket
npx wrangler r2 bucket create mcp-expertise-data

# Upload your expertise file
npx wrangler r2 object put mcp-expertise-data/expertise.yaml \
  --file content/writing-feedback.yaml \
  --content-type "text/yaml"

# Deploy the worker
bun run deploy
```

### 5. Connect your AI assistant

Add to Claude Code settings or your MCP client config:

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

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your YAML     │     │  Cloudflare     │     │  AI Assistant   │
│   Expertise     │────▶│  Worker + R2    │────▶│  (Claude, etc)  │
│                 │     │                 │     │                 │
│  - Principles   │     │  MCP Server     │     │  Uses guidance  │
│  - Checkpoints  │     │  - Caches YAML  │     │  to analyze     │
│  - Quality      │     │  - Exposes tools│     │  content        │
│    checks       │     │                 │     │  LOCALLY        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  User's Content │
                                                │  (stays local)  │
                                                └─────────────────┘
```

1. You write expertise in YAML (human-readable, version-controlled)
2. YAML is uploaded to Cloudflare R2 storage
3. Cloudflare Worker reads YAML and exposes MCP tools
4. AI assistant calls tools to get guidance
5. AI analyzes user's content **locally** using the guidance
6. User gets feedback based on your expertise

## MCP Tools Created

Based on your `meta.toolPrefix`, the server creates these tools:

| Tool | Purpose |
|------|---------|
| `load_{prefix}_context` | Load full expertise context for creating/improving content |
| `review_{prefix}_content` | Get review criteria for critiquing existing content |
| `get_{prefix}_guidelines` | Get formatted guidelines for specific topics |
| `get_capabilities` | List all available tools |

## Example Domains

This toolkit works for any domain where you have expertise to share:

- **Writing Feedback** (included example): Clarity, structure, tone
- **Code Review**: Best practices, patterns, common bugs
- **Recipe Improvement**: Technique, flavor balance, presentation
- **Legal Document Review**: Completeness, clarity, compliance
- **Security Report Writing**: Structure, evidence, recommendations

## Key Concepts

### Semantic Guidance (Not Keywords)

Instead of teaching AI to match keywords like "introduction" or "conclusion", describe **concepts**:

```yaml
# Bad - keyword matching
whatIndicatesPresence:
  - "introduction"
  - "overview"
  - "summary"

# Good - semantic understanding
whatIndicatesPresence:
  - "Clear statement of what the content is about"
  - "Explanation of why this matters to the reader"
  - "Preview of what the reader will learn"
```

AI understands meaning. Describe what you're looking for conceptually.

### Detail Levels

Control token usage with `detail_level`:

- **minimal** (~2k tokens): Core checkpoints only
- **standard** (~5k tokens): Checkpoints + quality checks + principles
- **comprehensive** (~10k tokens): Everything including examples

### Privacy by Design

The server only returns expertise/guidelines. User content is analyzed by the AI locally and is **never sent to the server**. This is mentioned in tool descriptions and the privacy statement.

## Documentation

- [Schema Reference](docs/schema-reference.md) - Complete YAML format
- [Deployment Guide](docs/deployment-guide.md) - Cloudflare setup details

## Comparison: MCP vs. Claude Code Skills

| Aspect | MCP Expertise Server | Claude Code Skills |
|--------|---------------------|-------------------|
| Works with | Any MCP client (Claude, Cursor, etc.) | Claude Code only |
| Updates | Central server, instant | Requires local file sync |
| Installation | Add server URL to config | Copy files to ~/.claude/skills |
| Best for | Shared expertise, teams | Personal workflows |

Use MCP when you want expertise accessible from multiple tools or shared across a team. Use Skills for personal, local-only workflows.

## License

MIT

## Credits

Based on patterns from [zeltser-website-mcp-server](https://github.com/lennyzeltser/zeltser-website-mcp-server) by Lenny Zeltser.
