# MCP Expertise Toolkit

Turn your domain expertise into an AI-accessible knowledge base. This project is a template for building [Model Context Protocol](https://modelcontextprotocol.io) (MCP) servers that deliver feedback and guidance to AI assistants. Deploy it on [Cloudflare Workers](https://developers.cloudflare.com/agents/model-context-protocol/), and AI tools like Claude, Cursor, and others can query your expertise directly.

Cloudflare is [well-suited for hosting remote MCP servers](https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/). Its Workers platform handles the transport layer, and the `agents` framework manages persistent client sessions.

**This is a template repository.** Fork it, customize it with your expertise, then deploy it.

---

- [Why This Matters](#why-this-matters)
- [How It Works](#how-it-works)
- [Quick Start](#quick-start)
- [YAML Schema](#yaml-schema)
- [MCP Tools Created](#mcp-tools-created)
- [Adapting for Your Domain](#adapting-for-your-domain)
- [MCP Client Setup](#mcp-client-setup)
- [Deployment Options](#deployment-options)
- [Privacy and Threat Model](#privacy-and-threat-model)
- [Prerequisites](#prerequisites)
- [Development](#development)
- [Author](#author)

---

## Why This Matters

You have expertise. Maybe you're good at writing, code review, recipe development, or security analysis. AI assistants can help users in these domains, but they lack your specific knowledge and standards.

This toolkit lets you codify that expertise in a YAML file and make it available through MCP. When users connect their AI assistant to your server, the AI can query your guidelines to provide feedback shaped by your expertise.

You might use this to:

- Help users improve their writing with your editorial standards
- Guide developers with your code review criteria
- Share your domain knowledge with anyone who has an MCP-compatible AI tool

To see this approach in action, take a look at how [it helps people writing better incident response reports](https://zeltser.com/good-ir-reports-with-ai).

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Your Expertise (YAML)                           │
│                                                                         │
│   Principles, checkpoints, quality checks, and review guidance          │
│   codified in a structured format that AI can understand.               │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Cloudflare R2                                  │
│                                                                         │
│   Stores your expertise YAML files. Upload one or more .yaml files.     │
│   The Worker discovers all files and creates tools for each domain.     │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Worker                                │
│                                                                         │
│   Implements the MCP server. Parses YAML and exposes tools.             │
│   Uses the @modelcontextprotocol/sdk for protocol handling.             │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           MCP Clients                                   │
│            (Claude Desktop, Claude Code, Cursor, etc.)                  │
│                                                                         │
│   Tools available to the AI:                                            │
│   • load_{prefix}_context    — Get expertise for creating content       │
│   • review_{prefix}_content  — Get criteria for reviewing content       │
│   • get_{prefix}_guidelines  — Get formatted guidelines by topic        │
│   • get_capabilities         — List available tools                     │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     User's Content (stays local)                        │
│                                                                         │
│   The AI analyzes the user's content locally using your guidelines.     │
│   User content is not sent to your server — only tool requests.         │
└─────────────────────────────────────────────────────────────────────────┘
```

**The privacy model:** Your server returns expertise and guidelines. The AI assistant analyzes the user's content locally using those guidelines. User content never leaves their machine.

## Quick Start

You can follow these steps manually or point an AI coding tool (Claude Code, Cursor, etc.) at this repo and ask it to set things up.

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/mcp-expertise-toolkit.git
cd mcp-expertise-toolkit
bun install  # or: npm install
```

### 2. Create Your Expertise File

Start with the starter template in `content/`:

```bash
cp content/_starter-template.yaml content/my-domain.yaml
```

Edit the file and replace all `[REPLACE: ...]` placeholders with your domain expertise. See `content/readme-review.yaml` and `content/bbq-scoring.yaml` for complete examples.

Each file has a `toolPrefix` that determines its tool names. You can deploy one file or multiple files to the same server.

### 3. Validate

```bash
bun run validate
```

This checks your YAML against the schema and shows what tools will be created.

### 4. Deploy to Cloudflare

[Cloudflare Workers](https://developers.cloudflare.com/workers/) run your code at the edge, close to users worldwide. [R2](https://developers.cloudflare.com/r2/) is Cloudflare's object storage for your expertise file. Both have generous free tiers.

```bash
# Authenticate with Cloudflare
npx wrangler login

# Create R2 bucket for your expertise file
npx wrangler r2 bucket create mcp-expertise-data

# Upload your expertise file(s)
npx wrangler r2 object put mcp-expertise-data/your-domain.yaml \
  --file content/your-domain.yaml \
  --content-type "text/yaml"

# To upload multiple domains:
# npx wrangler r2 object put mcp-expertise-data/another-domain.yaml \
#   --file content/another-domain.yaml --content-type "text/yaml"

# Deploy the Worker
bun run deploy
```

The deploy command outputs your server URL (e.g., `https://mcp-expertise-server.YOUR-ACCOUNT.workers.dev`).

### 5. Test Your Server

Visit your Worker URL in a browser. You should see JSON with your domain name and available tools.

---

## YAML Schema

Your expertise file has these main sections:

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

---

## MCP Tools Created

Based on your `meta.toolPrefix`, the server creates these tools:

| Tool | Purpose |
|------|---------|
| `load_{prefix}_context` | Load expertise context for creating or improving content |
| `review_{prefix}_content` | Get review criteria for critiquing existing content |
| `get_{prefix}_guidelines` | Get formatted guidelines for specific topics |
| `get_capabilities` | List all available tools |

**Parameters for `load_{prefix}_context`:**

| Parameter | Description |
|-----------|-------------|
| `detail_level` | `minimal` (~2k tokens), `standard` (~5k tokens), `comprehensive` (~10k tokens) |
| `topics` | Specific areas: `completeness`, `quality`, `principles`, `categories`, `requirements`, `all` |
| `include_examples` | Include good/bad examples (default: false) |
| `category` | Filter to a specific content category |

**See it in action:** Each example includes a demo showing a realistic session:
- [DEMO-readme-review.md](content/DEMO-readme-review.md) — README review for humans + AI assistants
- [DEMO-bbq-scoring.md](content/DEMO-bbq-scoring.md) — BBQ competition judging

---

## Adapting for Your Domain

To create expertise for code review, recipes, or another domain:

1. **Identify your principles** — What are the 3-5 most important guidelines?
2. **Define checkpoints** — What must good content include?
3. **List quality checks** — What specific issues do you commonly flag?
4. **Set the tone** — How should feedback be delivered?

Once you've thought through these questions, start with `content/_starter-template.yaml` and fill in your answers.

**Example: Code Review**

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

---

## MCP Client Setup

Once deployed, users can connect their AI assistants to your server.

### Claude Code

```bash
claude mcp add your-expertise --transport http https://YOUR-WORKER.workers.dev/mcp
```

Or add to `~/.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "your-expertise": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://YOUR-WORKER.workers.dev/mcp"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "your-expertise": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://YOUR-WORKER.workers.dev/mcp"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "your-expertise": {
      "url": "https://YOUR-WORKER.workers.dev/mcp"
    }
  }
}
```

### Other MCP Clients

Use the [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) package to connect via the `/mcp` endpoint (streamable HTTP, recommended) or `/sse` endpoint (SSE transport, legacy).

---

## Deployment Options

### Cloudflare Workers + R2 (Default)

The included `wrangler.jsonc` configures deployment to [Cloudflare Workers](https://developers.cloudflare.com/workers/) with [R2 storage](https://developers.cloudflare.com/r2/). Cloudflare's free tier is sufficient for most use cases.

### Custom Domain

To use a custom domain instead of workers.dev:

1. Add your domain to Cloudflare (DNS must be managed by Cloudflare)
2. Edit `wrangler.jsonc`:

```jsonc
{
  "routes": [
    { "pattern": "expertise.yourdomain.com", "custom_domain": true }
  ],
  "workers_dev": false
}
```

3. Deploy: `bun run deploy`

### Other Platforms

The server is standard TypeScript that runs anywhere. To deploy elsewhere:

1. Replace the R2 storage calls in `src/index.ts` with your storage backend (filesystem, S3, database)
2. Adapt the HTTP handling for your platform (Express, Hono, Fastify)
3. The MCP protocol handling uses [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk), which is platform-agnostic

### Local Server (No Cloudflare)

The `bun run dev` command runs a local server using Wrangler's emulation of Cloudflare Workers. For a standalone local server without any Cloudflare dependency:

**What needs to change:**
- Replace R2 storage with filesystem reads (`fs.readFileSync()`)
- Replace the `McpAgent` class with direct `McpServer` + an HTTP framework (Express, Hono, Fastify)
- Use standard Node.js/Bun HTTP server instead of Workers fetch handler

**What stays the same:**
- All type definitions (`src/types.ts`)
- YAML parsing and Zod validation
- Tool definitions and context builders
- The `@modelcontextprotocol/sdk` package

The core MCP logic is platform-agnostic. The Cloudflare-specific code is in the HTTP handling and storage layer.

---

## Privacy and Threat Model

This design keeps user content local. Consider these characteristics before deploying:

### What's Exposed

| Exposure | Mechanism |
|----------|-----------|
| Your expertise content | Anyone with the URL can call the tools |
| Tool parameters | Server logs may contain checkpoint IDs, topic names |
| Server metadata | Health endpoint reveals domain name, author, tool names |

### What's NOT Exposed

| Protected | Why |
|-----------|-----|
| User content | AI analyzes locally; content never sent to server |
| User queries | The AI's prompts stay between user and AI provider |
| Usage patterns | No tracking or analytics built in |

### Assumptions

- **Your expertise is meant to be shared.** The YAML content becomes public to anyone who knows the URL.
- **No authentication by default.** The MCP server accepts connections from any client.
- **The AI assistant is trusted.** Users trust their AI provider not to leak their content.

### Recommendations

- Treat your expertise YAML as public documentation
- Don't embed sensitive information in the YAML
- If you need access control, consider [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)

---

## Prerequisites

| Requirement | What It's For |
|-------------|---------------|
| [Node.js 18+](https://nodejs.org/) or [Bun](https://bun.sh/) | Runs the validation script and development server |
| [Cloudflare account](https://dash.cloudflare.com/sign-up) | Hosts the Worker and R2 bucket. Free tier is sufficient. |
| [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) | Deploys the Worker and manages R2. Installed via `bun install`. |

---

## Development

### Repository Structure

```
mcp-expertise-toolkit/
├── content/
│   ├── _starter-template.yaml  # Start here: minimal template for your expertise
│   ├── README.md               # Guide to creating expertise files
│   ├── readme-review.yaml      # Sample: README review for humans + AI
│   ├── bbq-scoring.yaml        # Sample: BBQ competition judging
│   ├── DEMO-readme-review.md   # Demo session for README review
│   └── DEMO-bbq-scoring.md     # Demo session for BBQ scoring
├── src/
│   ├── index.ts                # MCP server implementation
│   └── types.ts                # TypeScript types and Zod schemas
├── scripts/
│   └── validate-expertise.ts   # Validates your YAML
├── docs/
│   └── schema-reference.md     # Complete YAML format
├── wrangler.jsonc              # Cloudflare Worker config
└── package.json
```

**Sample files included:**
| File | Domain | Why It's Interesting |
|------|--------|---------------------|
| `readme-review.yaml` | README review | Expertise for both human readers AND AI coding assistants |
| `bbq-scoring.yaml` | BBQ competition | Highly specialized criteria (KCBS judging) that generic AI doesn't know |

**Multi-domain support:** The server automatically discovers all `.yaml` files in the R2 bucket and creates tools for each. Each file's `toolPrefix` must be unique. You can deploy a single domain or combine multiple domains in one server.

### Commands

```bash
bun run dev          # Local development server (http://localhost:8787)
bun run validate     # Validate expertise YAML
bun run type-check   # TypeScript checking
bun run deploy       # Deploy to Cloudflare
```

### MCP vs. Claude Code Skills

| Aspect | MCP Server | Claude Code Skills |
|--------|------------|-------------------|
| Works with | Any MCP client | Claude Code only |
| Updates | Deploy to server | Sync local files |
| Best for | Teams, shared expertise | Personal workflows |

Use MCP when you want expertise accessible from multiple AI tools or shared across a team.

---

## Troubleshooting

**Tools not appearing after deployment?**

1. **Check `get_capabilities`** — Call this tool to see loaded domains. If your expertise file failed validation, a **Diagnostics** section will show the file name and error:

   ```
   ## Diagnostics

   Some expertise files failed validation:

   - **my-domain.yaml:** principles: Invalid input: expected array...
   ```

2. **Run local validation** — Get detailed error messages:
   ```bash
   bun run validate
   ```

3. **Check R2 upload** — Verify your YAML file was uploaded to the R2 bucket

4. **Check toolPrefix uniqueness** — Each expertise file needs a unique `toolPrefix` value

---

## AI Agent Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | MCP server: tool definitions, R2 loading, YAML parsing, context builders |
| `src/types.ts` | TypeScript interfaces and Zod validation schemas for expertise YAML |
| `content/_starter-template.yaml` | Template for creating new expertise domains |
| `scripts/validate-expertise.ts` | Validates YAML files against the schema |
| `wrangler.jsonc` | Cloudflare Worker and R2 bucket configuration |

### Architecture

```
Expertise YAML → R2 Bucket → Worker (parses YAML, creates MCP tools) → AI Client
                                                                          ↓
                                                              Local analysis of user content
```

- Each `.yaml` file in R2 becomes a set of MCP tools (prefixed by `toolPrefix`)
- The Worker auto-discovers all YAML files in the bucket
- User content never leaves the client; only expertise/guidelines flow from the server

### Common Dev Tasks

```bash
bun run dev          # Local dev server (http://localhost:8787)
bun run validate     # Validate expertise YAML against schema
bun run type-check   # TypeScript checking
bun run deploy       # Deploy to Cloudflare
```

---

## Author

**[Lenny Zeltser](https://zeltser.com)**: Builder of security products and programs. Teacher of those who run them.
