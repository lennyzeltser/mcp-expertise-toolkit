# Sample Expertise Files

This directory contains **sample YAML files for demonstration purposes**. These examples show how to structure expertise content but are not intended for production use. You should create your own expertise files based on your domain knowledge.

## Directory Contents

| File Type | Purpose |
|-----------|---------|
| `_starter-template.yaml` | Minimal template to start your own expertise file |
| `*.yaml` | Sample expertise files demonstrating the schema |
| `DEMO-*.md` | Demo sessions showing how the tools work in practice |

## Sample Files

| File | Domain | Purpose |
|------|--------|---------|
| `readme-review.yaml` | README file quality | Demonstrates principles, checkpoints, and quality checks |
| `bbq-scoring.yaml` | BBQ competition judging | Shows a very different domain to illustrate flexibility |

These samples use placeholder author names (`[REPLACE: Your Name]`) to make clear they're templates, not production content.

## Creating Your Own Expertise File

1. **Start with the template:**
   ```bash
   cp _starter-template.yaml my-domain.yaml
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

Demo files (`DEMO-*.md`) show realistic conversations where AI uses the sample expertise tools. They help you understand:

- Expected tool usage patterns
- The value of domain expertise vs generic AI
- How to document your own MCP server

## Uploading to R2

After creating your expertise file:

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
