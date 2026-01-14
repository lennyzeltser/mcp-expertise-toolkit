import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import YAML from "yaml";
import type {
	ExpertiseContent,
	ExpertiseContext,
	ReviewContext,
	Checkpoint,
	Principle,
} from "./types";
import {
	ExpertiseContentSchema,
	getToolPrefix,
	DEFAULT_PRIVACY_STATEMENT,
} from "./types";

// Environment bindings (from wrangler.jsonc)
interface Env extends Cloudflare.Env {
	EXPERTISE_BUCKET: R2Bucket;
}

// Configuration
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Cache for expertise content (keyed by filename)
const expertiseCache = new Map<
	string,
	{ content: ExpertiseContent; timestamp: number }
>();

/**
 * List all YAML files in the R2 bucket.
 */
async function listExpertiseFiles(bucket: R2Bucket): Promise<string[]> {
	const list = await bucket.list();
	return list.objects
		.map((obj) => obj.key)
		.filter((key) => key.endsWith(".yaml"));
}

/**
 * Load and validate a single expertise YAML file from R2.
 */
async function loadExpertiseFile(
	bucket: R2Bucket,
	filename: string,
): Promise<ExpertiseContent | null> {
	const now = Date.now();

	// Return cached content if still valid
	const cached = expertiseCache.get(filename);
	if (cached && now - cached.timestamp < CACHE_TTL_MS) {
		return cached.content;
	}

	try {
		const object = await bucket.get(filename);
		if (!object) {
			console.log(`Expertise file not found in R2 bucket: ${filename}`);
			return null;
		}

		const yamlText = await object.text();
		const data = YAML.parse(yamlText);

		// Validate with Zod schema
		const result = ExpertiseContentSchema.safeParse(data);
		if (!result.success) {
			console.error(
				`Expertise content validation failed for ${filename}:`,
				result.error.issues,
			);
			return null;
		}

		const content = result.data as ExpertiseContent;
		expertiseCache.set(filename, { content, timestamp: now });
		return content;
	} catch (error) {
		console.error(`Error loading expertise content from ${filename}:`, error);
		return null;
	}
}

/**
 * Load all expertise files from R2 bucket.
 * Returns array of loaded content with their filenames.
 */
async function getAllExpertiseContent(
	bucket: R2Bucket,
): Promise<{ filename: string; content: ExpertiseContent }[]> {
	const files = await listExpertiseFiles(bucket);
	const results: { filename: string; content: ExpertiseContent }[] = [];

	for (const filename of files) {
		const content = await loadExpertiseFile(bucket, filename);
		if (content) {
			results.push({ filename, content });
		}
	}

	return results;
}

// ============================================================================
// Context Builders
// ============================================================================

/**
 * Build the AI-consumable context from expertise content.
 * This transforms stored content into the format for the load_expertise_context tool.
 *
 * @param content - The expertise content from R2
 * @param options - Configuration options
 */
function buildExpertiseContext(
	content: ExpertiseContent,
	options: {
		topics?: string[];
		includeExamples?: boolean;
		detailLevel?: "minimal" | "standard" | "comprehensive";
		category?: string;
	} = {},
): ExpertiseContext {
	const {
		topics,
		includeExamples = false,
		detailLevel = "standard",
		category,
	} = options;

	const allTopics = topics?.includes("all") || detailLevel === "comprehensive";

	// Helper to strip examples if not requested
	const stripExamples = <T extends { exampleGood?: string; examplePoor?: string }>(
		items: T[],
	): T[] => {
		if (includeExamples) return items;
		return items.map((item) => {
			const { exampleGood, examplePoor, ...rest } = item;
			return rest as T;
		});
	};

	// Strip examples from principles if needed
	const stripPrincipleExamples = (principles: Principle[]): Principle[] => {
		if (includeExamples) return principles;
		return principles.map((p) => ({
			...p,
			examples: undefined,
		}));
	};

	// Build checkpoints based on topics/detail level
	const checkpoints =
		allTopics || topics?.includes("completeness")
			? stripExamples(content.checkpoints)
			: [];

	// Build categories (filter by specific category if requested)
	let categories = content.categories || [];
	if (category && categories.length > 0) {
		categories = categories.filter((c) => c.id === category);
	}
	if (!allTopics && !topics?.includes("categories")) {
		categories = [];
	}

	// Build principles
	const principles =
		allTopics || topics?.includes("principles")
			? stripPrincipleExamples(content.principles)
			: [];

	// Build quality checks (strip examples if not requested)
	let qualityChecks =
		allTopics || topics?.includes("quality")
			? content.qualityChecks
			: undefined;

	if (qualityChecks && !includeExamples) {
		const stripped: typeof qualityChecks = {};
		for (const [key, check] of Object.entries(qualityChecks)) {
			stripped[key] = {
				whatToCheck: check.whatToCheck,
				whyItMatters: check.whyItMatters,
				examples: [], // Empty array instead of removing
			};
		}
		qualityChecks = stripped;
	}

	// Build requirements
	const requirements =
		allTopics || topics?.includes("requirements")
			? content.requirements
			: undefined;

	const privacyStatement =
		content.meta.privacyStatement || DEFAULT_PRIVACY_STATEMENT;

	return {
		version: "1.0.0",
		generated: new Date().toISOString(),
		meta: {
			domain: content.meta.domain,
			author: content.meta.author,
			license: content.meta.license,
			privacyStatement,
			infoUrl: content.meta.infoUrl,
		},
		instructions: `IMPORTANT: Analyze the user's content locally using these guidelines. Do not include the user's content in any requests to this server. Use this context to help improve content in the "${content.meta.domain}" domain. Apply the checkpoints to verify completeness (look for semantic indicators, not keywords). Use the quality checks to identify issues. Reference the principles for guidance.`,
		completeness:
			checkpoints.length > 0
				? {
						assessmentGuidance:
							"Check if the content addresses each checkpoint. Look for the semantic indicators in whatIndicatesPresence—these are concepts to recognize, not keywords to match.",
						checkpoints,
					}
				: undefined,
		categories: categories.length > 0 ? categories : undefined,
		principles: principles.length > 0 ? principles : undefined,
		qualityChecks,
		requirements,
	};
}

/**
 * Build the review-focused context from expertise content.
 * Creates a smaller, targeted response for critiquing existing content.
 */
function buildReviewContext(
	content: ExpertiseContent,
	options: {
		checkpointIds?: string[];
		focus?: string[];
	} = {},
): ReviewContext {
	const { checkpointIds, focus } = options;

	// Filter checkpoints if specific ones requested
	const allCheckpoints = !checkpointIds || checkpointIds.includes("all");
	let checkpoints = content.checkpoints;
	if (!allCheckpoints && checkpointIds) {
		checkpoints = checkpoints.filter((c) => checkpointIds.includes(c.id));
	}

	// Filter quality checks based on focus
	const allFocus = !focus || focus.includes("all");
	let qualityChecks = content.qualityChecks;
	if (!allFocus && qualityChecks && focus) {
		const filtered: typeof qualityChecks = {};
		for (const f of focus) {
			if (qualityChecks[f]) {
				filtered[f] = qualityChecks[f];
			}
		}
		qualityChecks = Object.keys(filtered).length > 0 ? filtered : undefined;
	}

	const privacyStatement =
		content.meta.privacyStatement || DEFAULT_PRIVACY_STATEMENT;

	// Only include principles when full context is requested (no specific filters)
	// This keeps the review response focused when specific areas are requested
	const includePrinciples = allCheckpoints && allFocus;

	return {
		version: "1.0.0",
		generated: new Date().toISOString(),
		meta: {
			domain: content.meta.domain,
			author: content.meta.author,
			license: content.meta.license,
			privacyStatement,
		},
		reviewInstructions: `IMPORTANT: Analyze the user's content locally using these criteria. Do not include the user's content in any requests to this server. Review the content and provide constructive feedback. Check against the checkpoints and quality criteria. Identify both strengths and areas for improvement. Be specific—reference sections and quote text. Frame feedback collaboratively, not critically.`,
		feedbackGuidance: content.reviewGuidance,
		checkpoints: checkpoints.length > 0 ? checkpoints : undefined,
		qualityChecks,
		principles: includePrinciples ? content.principles : undefined,
	};
}

/**
 * Format guidelines for a specific topic as readable markdown.
 */
function formatGuidelines(content: ExpertiseContent, topic: string): string {
	const lines: string[] = [];

	switch (topic) {
		case "summary":
		case "overview": {
			lines.push(`# ${content.meta.domain}: Quick Reference`);
			lines.push("");
			lines.push(content.meta.description);
			lines.push("");
			lines.push("## Core Principles");
			for (const p of content.principles) {
				lines.push(`- **${p.name}**: ${p.description || p.guidelines[0]}`);
			}
			break;
		}

		case "principles": {
			lines.push("# Core Principles");
			lines.push("");
			for (const principle of content.principles) {
				lines.push(`## ${principle.name}`);
				if (principle.description) {
					lines.push(principle.description);
				}
				lines.push("");
				for (const g of principle.guidelines) {
					lines.push(`- ${g}`);
				}
				if (principle.examples && principle.examples.length > 0) {
					lines.push("");
					lines.push("**Examples:**");
					for (const ex of principle.examples) {
						lines.push(`- Bad: "${ex.bad}"`);
						lines.push(`  Good: "${ex.good}"`);
						if (ex.explanation) {
							lines.push(`  *${ex.explanation}*`);
						}
					}
				}
				lines.push("");
			}
			break;
		}

		case "checkpoints": {
			lines.push("# Checkpoints");
			lines.push("");
			for (const cp of content.checkpoints) {
				lines.push(`## ${cp.name}`);
				lines.push(`*${cp.purpose}*`);
				lines.push("");
				lines.push("**What to look for:**");
				for (const ind of cp.whatIndicatesPresence) {
					lines.push(`- ${ind}`);
				}
				if (cp.commonProblems.length > 0) {
					lines.push("");
					lines.push("**Common problems:**");
					for (const prob of cp.commonProblems) {
						lines.push(`- ${prob}`);
					}
				}
				lines.push("");
			}
			break;
		}

		case "quality": {
			lines.push("# Quality Checks");
			lines.push("");
			if (content.qualityChecks) {
				for (const [name, check] of Object.entries(content.qualityChecks)) {
					lines.push(`## ${name.charAt(0).toUpperCase() + name.slice(1)}`);
					lines.push(`**What to check:** ${check.whatToCheck}`);
					lines.push(`**Why it matters:** ${check.whyItMatters}`);
					if (check.examples.length > 0) {
						lines.push("");
						lines.push("**Examples:**");
						for (const ex of check.examples) {
							lines.push(`- Bad: "${ex.bad}"`);
							lines.push(`  Good: "${ex.good}"`);
						}
					}
					lines.push("");
				}
			} else {
				lines.push("No quality checks defined.");
			}
			break;
		}

		case "review": {
			lines.push("# Review Guidance");
			lines.push("");
			if (content.reviewGuidance.purpose) {
				lines.push(content.reviewGuidance.purpose);
				lines.push("");
			}
			lines.push("## Feedback Structure");
			for (const item of content.reviewGuidance.feedbackStructure) {
				lines.push(`- ${item}`);
			}
			lines.push("");
			lines.push("## Tone");
			for (const item of content.reviewGuidance.tone) {
				lines.push(`- ${item}`);
			}
			if (
				content.reviewGuidance.reviewerMindset &&
				content.reviewGuidance.reviewerMindset.length > 0
			) {
				lines.push("");
				lines.push("## Reviewer Mindset");
				for (const item of content.reviewGuidance.reviewerMindset) {
					lines.push(`- ${item}`);
				}
			}
			break;
		}

		default: {
			// Full guidelines
			lines.push(`# ${content.meta.domain} Guidelines`);
			lines.push("");
			lines.push(content.meta.description);
			lines.push("");
			lines.push("## Principles");
			for (const p of content.principles) {
				lines.push(`### ${p.name}`);
				for (const g of p.guidelines) {
					lines.push(`- ${g}`);
				}
				lines.push("");
			}
			lines.push("## Checkpoints");
			for (const cp of content.checkpoints) {
				lines.push(`### ${cp.name}`);
				lines.push(`*${cp.purpose}*`);
				lines.push("");
			}
		}
	}

	// Add info URL if available
	if (content.meta.infoUrl) {
		lines.push("");
		lines.push("---");
		lines.push(`For more information: ${content.meta.infoUrl}`);
	}

	return lines.join("\n");
}

/**
 * Format capabilities for a single domain.
 */
function formatDomainCapabilities(content: ExpertiseContent): {
	domain: string;
	prefix: string;
	description: string;
	tools: { name: string; description: string }[];
} {
	const prefix = getToolPrefix(content.meta);
	return {
		domain: content.meta.domain,
		prefix,
		description: content.meta.description,
		tools: [
			{
				name: `load_${prefix}_context`,
				description: `Load ${content.meta.domain} context for local analysis`,
			},
			{
				name: `review_${prefix}_content`,
				description: `Get review criteria for ${content.meta.domain.toLowerCase()} content`,
			},
			{
				name: `get_${prefix}_guidelines`,
				description: `Get ${content.meta.domain.toLowerCase()} guidelines as markdown`,
			},
		],
	};
}

/**
 * Format all capabilities as readable markdown.
 */
function formatAllCapabilities(
	allContent: { filename: string; content: ExpertiseContent }[],
): string {
	const lines = [
		"# MCP Expertise Server Capabilities",
		"",
		`This server provides expertise in ${allContent.length} domain${allContent.length === 1 ? "" : "s"}:`,
		"",
	];

	for (const { content } of allContent) {
		const prefix = getToolPrefix(content.meta);
		lines.push(`## ${content.meta.domain}`);
		lines.push(`**Author:** ${content.meta.author}`);
		lines.push(`**Description:** ${content.meta.description}`);
		lines.push("");
		lines.push("**Tools:**");
		lines.push(`- \`load_${prefix}_context\` — Load context for creating/improving content`);
		lines.push(`- \`review_${prefix}_content\` — Get criteria for reviewing content`);
		lines.push(`- \`get_${prefix}_guidelines\` — Get guidelines as markdown`);
		lines.push("");
	}

	lines.push("## Privacy");
	lines.push(DEFAULT_PRIVACY_STATEMENT);
	lines.push("");
	lines.push("Your content is analyzed locally by your AI assistant. It is never sent to this server.");

	return lines.join("\n");
}

// ============================================================================
// MCP Server Implementation
// ============================================================================

export class ExpertiseMCP extends McpAgent {
	server = new McpServer({
		name: "MCP Expertise Server",
		version: "1.0.0",
	});

	async init() {
		const bucket = (this.env as Env).EXPERTISE_BUCKET;

		// Load all expertise files
		const allContent = await getAllExpertiseContent(bucket);

		if (allContent.length === 0) {
			// Register a single tool that explains the setup is incomplete
			this.server.tool(
				"get_status",
				"Check server status and configuration",
				{},
				async () => ({
					content: [
						{
							type: "text",
							text: `No expertise files found. Please upload one or more .yaml files to the R2 bucket.\n\nSee the README for setup instructions.`,
						},
					],
					isError: true,
				}),
			);
			return;
		}

		// Track registered prefixes to detect collisions
		const registeredPrefixes = new Set<string>();
		const warnings: string[] = [];

		// Register tools for each expertise domain
		for (const { filename, content } of allContent) {
			const prefix = getToolPrefix(content.meta);

			// Check for prefix collision
			if (registeredPrefixes.has(prefix)) {
				warnings.push(
					`Skipped ${filename}: toolPrefix "${prefix}" already registered by another file`,
				);
				console.warn(
					`Skipping ${filename}: toolPrefix "${prefix}" collides with an already registered domain`,
				);
				continue;
			}
			registeredPrefixes.add(prefix);

			// Register tools for this domain
			this.registerDomainTools(bucket, filename, content, prefix);
		}

		// Register unified get_capabilities tool
		this.server.tool(
			"get_capabilities",
			"List all expertise domains and tools available from this MCP server.",
			{},
			async () => {
				try {
					const currentContent = await getAllExpertiseContent(bucket);
					if (currentContent.length === 0) {
						return {
							content: [{ type: "text", text: "No expertise domains loaded." }],
							isError: true,
						};
					}

					const capabilities = formatAllCapabilities(currentContent);
					return {
						content: [{ type: "text", text: capabilities }],
					};
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return {
						content: [{ type: "text", text: `Error: ${message}` }],
						isError: true,
					};
				}
			},
		);
	}

	/**
	 * Register the three domain-specific tools for a single expertise file.
	 */
	private registerDomainTools(
		bucket: R2Bucket,
		filename: string,
		content: ExpertiseContent,
		prefix: string,
	) {
		// ================================================================
		// Tool 1: Load Expertise Context
		// ================================================================
		const loadToolName = `load_${prefix}_context`;
		this.server.tool(
			loadToolName,
			`Load ${content.meta.domain} context for local analysis. Returns guidelines for checkpoints, quality checks, and principles. Your AI uses this context to analyze your content locally—your content is never sent to this server. Use detail_level to control response size.`,
			{
				detail_level: z
					.enum(["minimal", "standard", "comprehensive"])
					.optional()
					.describe(
						"Level of detail. 'minimal': core checkpoints only. 'standard': checkpoints + quality checks (default). 'comprehensive': everything including examples.",
					),
				topics: z
					.array(
						z.enum([
							"completeness",
							"categories",
							"principles",
							"quality",
							"requirements",
							"all",
						]),
					)
					.optional()
					.describe(
						"Specific topics to load. Overrides detail_level for fine-grained control.",
					),
				category: z
					.string()
					.max(100)
					.optional()
					.describe(
						"Load guidance for a specific category only (saves tokens).",
					),
				include_examples: z
					.boolean()
					.optional()
					.describe(
						"Include good/poor examples. Default: false. Set to true for learning.",
					),
			},
			async ({ detail_level, topics, category, include_examples }) => {
				try {
					const currentContent = await loadExpertiseFile(bucket, filename);
					if (!currentContent) {
						return {
							content: [
								{
									type: "text",
									text: "Expertise content not available.",
								},
							],
							isError: true,
						};
					}

					// Determine effective topics based on detail_level
					let effectiveTopics = topics;
					if (!topics || topics.length === 0) {
						switch (detail_level) {
							case "minimal":
								effectiveTopics = ["completeness"];
								break;
							case "comprehensive":
								effectiveTopics = ["all"];
								break;
							default:
								effectiveTopics = ["completeness", "quality", "principles"];
						}
					}

					const context = buildExpertiseContext(currentContent, {
						topics: effectiveTopics,
						includeExamples: include_examples ?? detail_level === "comprehensive",
						detailLevel: detail_level ?? "standard",
						category,
					});

					return {
						content: [{ type: "text", text: JSON.stringify(context, null, 2) }],
					};
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return {
						content: [{ type: "text", text: `Error: ${message}` }],
						isError: true,
					};
				}
			},
		);

		// ================================================================
		// Tool 2: Review Content
		// ================================================================
		const reviewToolName = `review_${prefix}_content`;
		this.server.tool(
			reviewToolName,
			`Get criteria for reviewing existing ${content.meta.domain.toLowerCase()} content. Returns checkpoints to verify, quality checks to apply, and guidance for constructive feedback. Your AI uses this to analyze your content locally—your content is never sent to this server.`,
			{
				checkpoints: z
					.array(z.string().max(100))
					.max(50)
					.optional()
					.describe(
						"Specific checkpoint IDs to get criteria for. Omit for all.",
					),
				focus: z
					.array(z.string().max(100))
					.max(50)
					.optional()
					.describe(
						"Quality check categories to focus on. Omit for all defined checks.",
					),
			},
			async ({ checkpoints, focus }) => {
				try {
					const currentContent = await loadExpertiseFile(bucket, filename);
					if (!currentContent) {
						return {
							content: [
								{
									type: "text",
									text: "Expertise content not available.",
								},
							],
							isError: true,
						};
					}

					const context = buildReviewContext(currentContent, {
						checkpointIds: checkpoints,
						focus,
					});

					return {
						content: [{ type: "text", text: JSON.stringify(context, null, 2) }],
					};
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return {
						content: [{ type: "text", text: `Error: ${message}` }],
						isError: true,
					};
				}
			},
		);

		// ================================================================
		// Tool 3: Get Guidelines
		// ================================================================
		const guidelinesToolName = `get_${prefix}_guidelines`;
		this.server.tool(
			guidelinesToolName,
			`Get ${content.meta.domain.toLowerCase()} guidelines formatted as readable markdown. Topics: summary, principles, checkpoints, quality, review. Omit topic for full guidelines.`,
			{
				topic: z
					.string()
					.max(50)
					.optional()
					.describe(
						"Specific topic: 'summary', 'principles', 'checkpoints', 'quality', 'review'. Omit for full guidelines.",
					),
			},
			async ({ topic }) => {
				try {
					const currentContent = await loadExpertiseFile(bucket, filename);
					if (!currentContent) {
						return {
							content: [
								{
									type: "text",
									text: "Expertise content not available.",
								},
							],
							isError: true,
						};
					}

					const formatted = formatGuidelines(currentContent, topic || "all");
					return {
						content: [{ type: "text", text: formatted }],
					};
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return {
						content: [{ type: "text", text: `Error: ${message}` }],
						isError: true,
					};
				}
			},
		);
	}
}

// ============================================================================
// HTTP Handler
// ============================================================================

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// SSE transport (legacy, but still supported)
		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return ExpertiseMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		// Streamable HTTP transport (recommended)
		if (url.pathname === "/mcp") {
			return ExpertiseMCP.serve("/mcp").fetch(request, env, ctx);
		}

		// Health check / info endpoint
		if (url.pathname === "/" || url.pathname === "/health") {
			try {
				const allContent = await getAllExpertiseContent(env.EXPERTISE_BUCKET);

				if (allContent.length === 0) {
					return new Response(
						JSON.stringify({
							name: "MCP Expertise Server",
							version: "1.0.0",
							status: "unconfigured",
							message: "Upload one or more .yaml files to R2 bucket to configure",
						}),
						{
							status: 503,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				// Build domain info
				const domains = allContent.map(({ filename, content }) => {
					const prefix = getToolPrefix(content.meta);
					return {
						domain: content.meta.domain,
						author: content.meta.author,
						description: content.meta.description,
						file: filename,
						tools: [
							`load_${prefix}_context`,
							`review_${prefix}_content`,
							`get_${prefix}_guidelines`,
						],
					};
				});

				// Collect all tool names
				const allTools = domains.flatMap((d) => d.tools);
				allTools.push("get_capabilities");

				return new Response(
					JSON.stringify({
						name: "MCP Expertise Server",
						version: "1.0.0",
						status: "ready",
						domainsLoaded: allContent.length,
						domains,
						endpoints: {
							sse: "/sse",
							mcp: "/mcp",
						},
						tools: allTools,
					}),
					{
						headers: { "Content-Type": "application/json" },
					},
				);
			} catch (error) {
				console.error("Health check failed:", error);
				return new Response(
					JSON.stringify({
						name: "MCP Expertise Server",
						version: "1.0.0",
						status: "error",
						error: "Failed to load expertise content",
					}),
					{
						status: 503,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		}

		return new Response("Not found", { status: 404 });
	},
};
