# Expertise Content Directory

This directory contains expertise YAML files and demo sessions. When you deploy the MCP server, files from this directory are uploaded to R2 storage and made available through MCP tools.

## Directory Contents

| File Type | Purpose |
|-----------|---------|
| `*.yaml` | Expertise definitions - each file creates 3 MCP tools |
| `DEMO-*.md` | Demo sessions showing how the tools work in practice |

## Included Examples

| File | Domain | Tools Created |
|------|--------|---------------|
| `readme-review.yaml` | README file quality | `load_readme_context`, `review_readme_content`, `get_readme_guidelines` |
| `bbq-scoring.yaml` | BBQ competition judging | `load_bbq_context`, `review_bbq_content`, `get_bbq_guidelines` |

These examples demonstrate very different domains to show the toolkit's flexibility.

## Creating Your Own Expertise File

1. **Copy an example** and rename it for your domain:
   ```bash
   cp readme-review.yaml my-domain.yaml
   ```

2. **Update the meta section** with your domain info:
   ```yaml
   meta:
     domain: "Your Domain Name"
     author: "Your Name"
     description: "What this expertise helps with"
     toolPrefix: "mydomain"  # lowercase, no spaces
   ```

3. **Define principles** - the high-level guidelines:
   ```yaml
   principles:
     - name: "Principle Name"
       description: "Why this matters"
       guidelines:
         - "Specific actionable guidance"
         - "Another specific guideline"
   ```

4. **Define checkpoints** - what to verify in content:
   ```yaml
   checkpoints:
     - id: "checkpoint_id"
       name: "Checkpoint Name"
       purpose: "What this checks for"
       whatIndicatesPresence:
         - "Semantic description of what to look for"
         - "Not keywords - describe concepts"
       commonProblems:
         - "Typical issues people have"
   ```

5. **Validate locally** before deploying:
   ```bash
   bun run validate
   ```

## Schema Reference

Full schema documentation is available at [`docs/schema-reference.md`](../docs/schema-reference.md).

Key sections in an expertise YAML file:

| Section | Required | Description |
|---------|----------|-------------|
| `version` | Yes | Schema version (e.g., "1.0.0") |
| `meta` | Yes | Domain name, author, toolPrefix |
| `principles` | Yes | High-level guidelines (min 1) |
| `checkpoints` | Yes | Verification criteria (min 1) |
| `categories` | No | Content type classifications |
| `qualityChecks` | No | Specific issues with good/bad examples |
| `reviewGuidance` | Yes | How to frame feedback |
| `requirements` | No | External constraints (compliance, etc.) |

## Semantic Indicators

The `whatIndicatesPresence` field is key to making your expertise work well. Use **semantic descriptions**, not keywords:

```yaml
# Bad - just keyword matching
whatIndicatesPresence:
  - "introduction"
  - "overview"

# Good - AI understands meaning
whatIndicatesPresence:
  - "Clear statement of what the content covers"
  - "Explanation of why the reader should care"
  - "Context that helps newcomers orient themselves"
```

## Demo Sessions

Demo files (`DEMO-*.md`) show realistic conversations where AI uses your expertise tools. They help:

- Document expected tool usage patterns
- Show the value of domain expertise vs generic AI
- Provide examples for users of your MCP server

Follow the annotation style in existing demos:

```markdown
## Behind the Scenes

The AI recognizes this task and calls:

**Tool call:** `review_mydomain_content`
```json
{
  "checkpoints": ["relevant", "checkpoints"],
  "focus": ["qualityChecks"]
}
```

**Server returns:** [Description of what the server provides]
```

## Uploading to R2

After creating or modifying expertise files:

1. **Validate first:**
   ```bash
   bun run validate
   ```

2. **Upload to R2:**
   ```bash
   npx wrangler r2 object put mcp-expertise-data/my-domain.yaml \
       --file=content/my-domain.yaml --content-type=text/yaml --remote
   ```

3. **Test the MCP server** to confirm tools appear in `get_capabilities`

## Troubleshooting

If your expertise doesn't appear in `get_capabilities`:

1. **Check validation:** Run `bun run validate` for detailed error messages
2. **Check R2 upload:** Verify the file exists in your R2 bucket
3. **Check diagnostics:** Call `get_capabilities` - validation errors appear in a Diagnostics section
4. **Check toolPrefix:** Each file needs a unique `toolPrefix` value
