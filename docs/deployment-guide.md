# Deployment Guide

Step-by-step instructions for deploying your MCP Expertise Server to Cloudflare.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)

## Step 1: Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/mcp-expertise-toolkit.git
cd mcp-expertise-toolkit
bun install
```

## Step 2: Authenticate with Cloudflare

```bash
npx wrangler login
```

This opens a browser to authenticate with your Cloudflare account.

## Step 3: Create R2 Bucket

R2 is Cloudflare's object storage. Create a bucket for your expertise file:

```bash
npx wrangler r2 bucket create mcp-expertise-data
```

**Note:** The bucket name must match what's in `wrangler.jsonc`. If you use a different name, update the config:

```jsonc
// wrangler.jsonc
"r2_buckets": [
  {
    "binding": "EXPERTISE_BUCKET",
    "bucket_name": "your-bucket-name",  // ← Change this
    "preview_bucket_name": "your-bucket-name"
  }
]
```

## Step 4: Create Your Expertise File

Edit `content/writing-feedback.yaml` or create a new file with your expertise. See [Schema Reference](schema-reference.md) for the format.

Validate before uploading:

```bash
bun run validate
```

## Step 5: Upload Expertise to R2

```bash
npx wrangler r2 object put mcp-expertise-data/expertise.yaml \
  --file content/writing-feedback.yaml \
  --content-type "text/yaml"
```

**Important:** The file must be named `expertise.yaml` in R2 (the server looks for this specific filename).

## Step 6: Configure Worker Name (Optional)

Edit `wrangler.jsonc` to customize your worker:

```jsonc
{
  // Change worker name (must be unique in your account)
  "name": "my-expertise-mcp",

  // Optional: Use a custom domain instead of workers.dev
  "routes": [
    {
      "pattern": "expertise.yourdomain.com",
      "custom_domain": true
    }
  ],
  "workers_dev": false  // Set to false if using custom domain
}
```

## Step 7: Deploy

```bash
bun run deploy
# Or: npx wrangler deploy
```

Output will show your server URL:

```
Published my-expertise-mcp (1.23 sec)
  https://my-expertise-mcp.YOUR-ACCOUNT.workers.dev
```

## Step 8: Test the Server

Check the health endpoint:

```bash
curl https://YOUR-WORKER.workers.dev/
```

Should return:

```json
{
  "name": "Your Domain MCP Server",
  "version": "1.0.0",
  "status": "ready",
  "tools": ["load_yourdomain_context", "review_yourdomain_content", ...]
}
```

## Step 9: Connect Your AI Assistant

### Claude Code

Add to `~/.claude/settings.local.json`:

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

### Cursor

Add to Cursor MCP settings:

```json
{
  "your-expertise": {
    "serverUrl": "https://YOUR-WORKER.workers.dev/mcp"
  }
}
```

### Other MCP Clients

Use the `/mcp` endpoint for the streamable HTTP transport (recommended) or `/sse` for Server-Sent Events.

## Updating Your Expertise

To update the expertise content:

1. Edit your YAML file
2. Validate: `bun run validate`
3. Upload: `npx wrangler r2 object put mcp-expertise-data/expertise.yaml --file your-file.yaml --content-type "text/yaml"`

The server caches content for 1 hour. Changes will be visible after the cache expires.

To force immediate update, redeploy the worker:

```bash
bun run deploy
```

## Troubleshooting

### "Expertise content not found"

- Check that `expertise.yaml` exists in your R2 bucket
- Verify the bucket name in `wrangler.jsonc` matches your actual bucket
- Run `npx wrangler r2 object list mcp-expertise-data` to see contents

### "Validation failed"

- Run `bun run validate` locally to see specific errors
- Check that all required fields are present
- Ensure `toolPrefix` is lowercase with no special characters

### "Worker not found" or 404

- Verify the worker deployed successfully: `npx wrangler deployments list`
- Check the URL matches your worker name
- Try the health endpoint: `curl https://YOUR-WORKER.workers.dev/`

### MCP client can't connect

- Use `/mcp` endpoint (not just the base URL)
- Check that `mcp-remote` is installed: `npm install -g mcp-remote`
- Verify the URL is correct in your client config

## Cost Considerations

Cloudflare Workers and R2 have generous free tiers:

- **Workers**: 100,000 requests/day free
- **R2**: 10 GB storage + 10 million requests/month free

For personal or small team use, you'll likely stay within free limits.

## Security Notes

- The expertise content is public (anyone who knows the URL can query it)
- User content is never sent to the server (AI analyzes locally)
- Consider the sensitivity of your expertise before deploying
- You can add authentication using Cloudflare Access if needed

## Custom Domain Setup

To use a custom domain instead of workers.dev:

1. Add your domain to Cloudflare (DNS must be managed by Cloudflare)
2. Update `wrangler.jsonc`:

```jsonc
{
  "routes": [
    {
      "pattern": "expertise.yourdomain.com",
      "custom_domain": true
    }
  ],
  "workers_dev": false
}
```

3. Deploy: `bun run deploy`

Cloudflare will automatically provision an SSL certificate.
