# MCP Expertise Toolkit

A template for building MCP servers that deliver domain-specific expertise to AI assistants.

## What This Does

You have expertise. Maybe you're good at writing, code review, recipe development, or security reports. This toolkit lets you codify that expertise in a YAML file and make it available to AI assistants through the Model Context Protocol (MCP).

When someone uses an AI assistant connected to your server, the AI can query your expertise to provide feedback. The AI analyzes the user's content locally using your guidelines—the user's content never leaves their machine.

**This is a template repository.** Fork it, customize it with your expertise, then deploy it.

### What MCP Is

MCP (Model Context Protocol) is a standard for connecting AI assistants to external tools and data sources. AI assistants like Claude (via Claude Code), Cursor, and others support MCP. When you deploy an MCP server, any compatible AI assistant can use the tools it provides.

### Example: What This Looks Like in Practice

Say you've deployed a writing feedback server. A user asks Claude to review their blog post:

```
User: "Review this blog post for clarity and structure"

Claude: [calls load_writing_context to get your expertise]
Claude: [analyzes the user's post locally using your checkpoints and quality checks]
Claude: "The introduction effectively states what readers will learn. Consider these improvements:
        1. The second paragraph jumps to implementation before explaining the problem...
        2. 'Utilize the methodology' could be simpler: 'Use this method'..."
```

Your expertise shaped that feedback. The user's blog post never left their machine.

## Prerequisites

- **Node.js 18+** or **Bun** (recommended)
- **Cloudflare account** (free tier works) for deployment
- **Wrangler CLI**: `npm install -g wrangler`

## Repository Structure

```
mcp-expertise-toolkit/
├── content/
│   └── writing-feedback.yaml   # Example expertise (replace with yours)
├── src/
│   ├── index.ts                # MCP server implementation
│   └── types.ts                # TypeScript types and Zod schemas
├── scripts/
│   └── validate-expertise.ts   # Validates your YAML
├── docs/
│   ├── schema-reference.md     # Complete YAML format
│   └── deployment-guide.md     # Cloudflare setup details
├── wrangler.jsonc              # Cloudflare Worker config
└── package.json
```

**To customize:** Edit `content/writing-feedback.yaml` (or create your own YAML file). The server code in `src/` rarely needs changes.

## How to Use This Template

### 1. Fork and install

```bash
git clone https://github.com/YOUR_USERNAME/mcp-expertise-toolkit.git
cd mcp-expertise-toolkit
bun install  # or: npm install
```

### 2. Create your expertise file

Edit `content/writing-feedback.yaml` or create a new file. The included example covers writing feedback—replace it with your domain.

**Key sections:**

```yaml
version: "1.0.0"

meta:
  domain: "Your Domain"           # e.g., "Code Review", "Recipe Feedback"
  author: "Your Name"
  description: "What this expertise covers"
  toolPrefix: "yourdomain"        # Creates tools like load_yourdomain_context

principles:                       # High-level guidelines (3-5 recommended)
  - name: "Core Principle"
    guidelines:
      - "First guideline"
      - "Second guideline"
    examples:                     # Optional but helpful
      - bad: "Example of poor practice"
        good: "Example of good practice"

checkpoints:                      # Things to verify in content
  - id: "section_id"
    name: "Section Name"
    purpose: "Why this matters"
    whatIndicatesPresence:        # Semantic descriptions, not keywords
      - "Concept to look for"
    commonProblems:
      - "What goes wrong when missing"

qualityChecks:                    # Specific issues to flag
  issue_type:
    whatToCheck: "What to look for"
    whyItMatters: "Why this matters"
    examples:
      - bad: "Example of the problem"
        good: "How to fix it"

reviewGuidance:                   # How to deliver feedback
  feedbackStructure:
    - "Start with strengths"
    - "Be specific"
  tone:
    - "Collaborative, not critical"
```

See [docs/schema-reference.md](docs/schema-reference.md) for the complete format.

### 3. Validate

```bash
bun run validate
# Or specify a file:
bun scripts/validate-expertise.ts path/to/your-expertise.yaml
```

This checks your YAML against the schema and shows what tools will be created.

### 4. Deploy

For Cloudflare (default):

```bash
npx wrangler login
npx wrangler r2 bucket create mcp-expertise-data
npx wrangler r2 object put mcp-expertise-data/expertise.yaml \
  --file content/your-expertise.yaml \
  --content-type "text/yaml"
bun run deploy
```

The deploy command outputs your server URL.

### 5. Connect your AI assistant

Add to Claude Code settings (`~/.claude/settings.local.json`):

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

For other MCP clients, use the `/mcp` endpoint URL directly.

## MCP Tools Created

Based on your `meta.toolPrefix`, the server creates these tools:

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `load_{prefix}_context` | Load full expertise context | Creating or improving content |
| `review_{prefix}_content` | Get review criteria | Critiquing existing content |
| `get_{prefix}_guidelines` | Get formatted guidelines | Quick reference on specific topics |
| `get_capabilities` | List available tools | Discovery |

**Parameters for `load_{prefix}_context`:**
- `detail_level`: `minimal` (~2k tokens), `standard` (~5k tokens), `comprehensive` (~10k tokens)
- `topics`: Specific areas to load (`completeness`, `quality`, `principles`, etc.)
- `include_examples`: Include good/bad examples (default: false)

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

### Adapting for a Different Domain

To create expertise for code review, recipes, or another domain:

1. **Identify your principles** — What are the 3-5 most important guidelines in your domain?
2. **Define checkpoints** — What must good content include? What do you always look for?
3. **List quality checks** — What specific issues do you commonly flag?
4. **Set the tone** — How should feedback be delivered?

**Example adaptation for code review:**

```yaml
meta:
  domain: "Code Review"
  toolPrefix: "code"

principles:
  - name: "Readability"
    guidelines:
      - "Code should be understandable without comments"
      - "Function names should describe what they do"

checkpoints:
  - id: "error_handling"
    name: "Error Handling"
    purpose: "Ensure failures are handled gracefully"
    whatIndicatesPresence:
      - "Try-catch blocks around operations that can fail"
      - "Meaningful error messages"
    commonProblems:
      - "Silent failures"
      - "Generic error messages"

qualityChecks:
  complexity:
    whatToCheck: "Functions doing too many things"
    whyItMatters: "Complex functions are hard to test and maintain"
    examples:
      - bad: "Function that fetches, validates, transforms, and saves"
        good: "Separate functions for each responsibility"
```

## Deployment Options

### Cloudflare Workers + R2 (default)

The included `wrangler.jsonc` configures deployment to Cloudflare Workers with R2 storage. This works on Cloudflare's free tier for most use cases.

### Other Platforms

The server is standard TypeScript that runs anywhere. To deploy elsewhere:

1. Replace the R2 storage calls in `src/index.ts` with your storage backend (filesystem, S3, database)
2. Adapt the HTTP handling for your platform (Express, Hono, Fastify)
3. The MCP protocol handling uses `@modelcontextprotocol/sdk`, which is platform-agnostic

### Local Development

```bash
bun run dev
# Server runs at http://localhost:8787
```

## Privacy and Threat Model

This design keeps user content local.

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
- Treat your YAML as public documentation
- Server logs may contain query parameters (checkpoint IDs, topic names), but not user content
- If you add authentication, update the threat model accordingly

## Documentation

- [Schema Reference](docs/schema-reference.md) — Complete YAML format with all fields
- [Deployment Guide](docs/deployment-guide.md) — Detailed Cloudflare setup

## MCP vs. Claude Code Skills

| Aspect | MCP Server | Claude Code Skills |
|--------|------------|-------------------|
| Works with | Any MCP client | Claude Code only |
| Updates | Deploy to server | Sync local files |
| Best for | Teams, shared expertise | Personal workflows |

Use MCP when you want expertise accessible from multiple AI tools or shared across a team.

## Author

Created by [Lenny Zeltser](https://zeltser.com).
