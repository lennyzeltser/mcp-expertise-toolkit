import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

// The Worker entry module extends McpAgent from the agents package, which
// needs the Workers runtime. Replace the base class with a stub so the real
// ExpertiseMCP.init() can register its tools against an in-memory transport.
mock.module("agents/mcp", () => ({
	McpAgent: class McpAgent {
		constructor(
			public ctx: unknown,
			public env: unknown,
		) {}
	},
}));

const CONTENT_DIR = resolve(import.meta.dir, "../content");
const README_YAML = readFileSync(`${CONTENT_DIR}/readme-review.yaml`, "utf-8");

// Mirrors the listing TTL in src/index.ts. The caches there are module-level,
// so each test advances the clock past the TTL before starting a server.
const LIST_CACHE_TTL_MS = 60 * 1000;
const realNow = Date.now;
let now = 1_700_000_000_000;

beforeAll(() => {
	Date.now = () => now;
});

afterAll(() => {
	Date.now = realNow;
});

// Schema-valid expertise with attribution on one quality check.
const ATTRIBUTED_YAML = `
version: "1.0.0"
meta:
  domain: "Attributed"
  author: "Generic Author"
  description: "Fixture with an externally licensed quality check."
  toolPrefix: "attr"
principles:
  - name: "Clarity"
    guidelines:
      - "Say one thing per sentence"
checkpoints:
  - id: "intro"
    name: "Introduction"
    purpose: "Sets context"
    whatIndicatesPresence:
      - "Statement of scope"
    commonProblems: []
qualityChecks:
  clarity:
    whatToCheck: "Vague wording"
    whyItMatters: "Readers lose the thread"
    examples:
      - bad: "stuff"
        good: "the config file"
  licensed:
    whatToCheck: "Borrowed rubric"
    whyItMatters: "Attribution"
    examples:
      - bad: "a"
        good: "b"
    originalAuthor: "Someone Else"
    sourceUrl: "https://example.com/rubric"
    attributionType: "external-licensed"
    license: "CC BY-SA 4.0"
reviewGuidance:
  feedbackStructure:
    - "Strengths first"
  tone:
    - "Collaborative"
`;

// A minimal stand-in for an R2 bucket that counts operations.
function fakeBucket(files: Record<string, string>) {
	const calls = { list: 0, head: 0, get: 0 };
	const bucket = {
		async list() {
			calls.list += 1;
			return {
				objects: Object.keys(files).map((key) => ({ key })),
				truncated: false,
			};
		},
		async head(key: string) {
			calls.head += 1;
			return key in files ? { etag: `etag-${key}` } : null;
		},
		async get(key: string) {
			calls.get += 1;
			if (!(key in files)) return null;
			const text = files[key];
			return {
				etag: `etag-${key}`,
				async text() {
					return text;
				},
			};
		},
	};
	return { bucket, calls };
}

async function startServer(files: Record<string, string>) {
	now += LIST_CACHE_TTL_MS + 1;
	const { ExpertiseMCP } = await import("../src/index");
	const { bucket, calls } = fakeBucket(files);
	// biome-ignore lint/suspicious/noExplicitAny: the stubbed base class takes (ctx, env)
	const agent = new (ExpertiseMCP as any)({}, { EXPERTISE_BUCKET: bucket });
	await agent.init();
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	await agent.server.connect(serverTransport);
	const client = new Client({ name: "test-client", version: "0.0.0" });
	await client.connect(clientTransport);
	return { client, calls };
}

type ToolResult = { isError?: boolean; text: string };

async function call(
	client: Client,
	name: string,
	args: Record<string, unknown>,
): Promise<ToolResult> {
	const result = (await client.callTool({ name, arguments: args })) as {
		isError?: boolean;
		content?: Array<{ type: string; text?: string }>;
	};
	const text = result.content?.[0]?.text ?? "";
	return { isError: result.isError, text };
}

describe("tool registration", () => {
	test("registers the documented tools with bounded argument schemas", async () => {
		const { client } = await startServer({ "readme-review.yaml": README_YAML });
		const { tools } = await client.listTools();
		expect(tools.map((t) => t.name).sort()).toEqual([
			"get_capabilities",
			"get_readme_guidelines",
			"load_readme_context",
			"review_readme_content",
		]);
		const load = tools.find((t) => t.name === "load_readme_context");
		const topics = (load?.inputSchema as { properties: Record<string, { maxItems?: number }> })
			.properties.topics;
		expect(topics.maxItems).toBe(6);
		const review = tools.find((t) => t.name === "review_readme_content");
		const props = (review?.inputSchema as { properties: Record<string, { maxItems?: number }> })
			.properties;
		expect(props.checkpoints.maxItems).toBe(50);
		expect(props.focus.maxItems).toBe(50);
	});
});

describe("review focus filter", () => {
	test("returns only requested own quality-check keys", async () => {
		const { client } = await startServer({ "readme-review.yaml": README_YAML });
		const res = await call(client, "review_readme_content", {
			focus: ["missingContext"],
		});
		expect(res.isError).toBeFalsy();
		const ctx = JSON.parse(res.text);
		expect(Object.keys(ctx.qualityChecks)).toEqual(["missingContext"]);
	});

	test("ignores inherited property names such as constructor", async () => {
		const { client } = await startServer({ "readme-review.yaml": README_YAML });
		for (const key of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
			const res = await call(client, "review_readme_content", { focus: [key] });
			expect(res.isError).toBeFalsy();
			const ctx = JSON.parse(res.text);
			expect(ctx.qualityChecks).toBeUndefined();
		}
		const mixed = JSON.parse(
			(await call(client, "review_readme_content", {
				focus: ["constructor", "missingContext"],
			})).text,
		);
		expect(Object.keys(mixed.qualityChecks)).toEqual(["missingContext"]);
	});
});

describe("load context quality checks", () => {
	test("standard level keeps attribution fields while dropping examples", async () => {
		const { client } = await startServer({ "attributed.yaml": ATTRIBUTED_YAML });
		const res = await call(client, "load_attr_context", { detail_level: "standard" });
		expect(res.isError).toBeFalsy();
		const ctx = JSON.parse(res.text);
		expect(ctx.qualityChecks.licensed.examples).toEqual([]);
		expect(ctx.qualityChecks.licensed.originalAuthor).toBe("Someone Else");
		expect(ctx.qualityChecks.licensed.sourceUrl).toBe("https://example.com/rubric");
		expect(ctx.qualityChecks.licensed.attributionType).toBe("external-licensed");
		expect(ctx.qualityChecks.licensed.license).toBe("CC BY-SA 4.0");
		expect(Object.keys(ctx.qualityChecks.clarity).sort()).toEqual([
			"examples",
			"whatToCheck",
			"whyItMatters",
		]);
	});

	test("comprehensive level keeps examples", async () => {
		const { client } = await startServer({ "attributed.yaml": ATTRIBUTED_YAML });
		const ctx = JSON.parse(
			(await call(client, "load_attr_context", { detail_level: "comprehensive" })).text,
		);
		expect(ctx.qualityChecks.clarity.examples).toHaveLength(1);
	});
});

describe("oversized tool input", () => {
	test("rejects a 100,000-element topics array quickly with a short error", async () => {
		const { client } = await startServer({ "readme-review.yaml": README_YAML });
		const started = performance.now();
		const res = await call(client, "load_readme_context", {
			topics: new Array(100_000).fill(0),
		});
		const elapsed = performance.now() - started;
		expect(res.isError).toBe(true);
		expect(res.text.length).toBeLessThan(500);
		expect(res.text).toContain("maximum");
		expect(elapsed).toBeLessThan(2000);
		// The session still works afterwards.
		const ok = await call(client, "load_readme_context", { detail_level: "minimal" });
		expect(ok.isError).toBeFalsy();
	});

	test("rejects seven topics but accepts six", async () => {
		const { client } = await startServer({ "readme-review.yaml": README_YAML });
		const seven = await call(client, "load_readme_context", {
			topics: ["all", "all", "all", "all", "all", "all", "all"],
		});
		expect(seven.isError).toBe(true);
		const six = await call(client, "load_readme_context", {
			topics: ["completeness", "categories", "principles", "quality", "requirements", "all"],
		});
		expect(six.isError).toBeFalsy();
	});

	test("counts unknown keys toward the cap: 200 elements pass, 201 fail", async () => {
		const { client } = await startServer({ "readme-review.yaml": README_YAML });
		// 50 + 50 array items + 97 extra items + 3 keys = 200.
		const atCap = await call(client, "review_readme_content", {
			checkpoints: new Array(50).fill("opening"),
			focus: new Array(50).fill("missingContext"),
			extra: new Array(97).fill(0),
		});
		expect(atCap.isError).toBeFalsy();
		const overCap = await call(client, "review_readme_content", {
			checkpoints: new Array(50).fill("opening"),
			focus: new Array(50).fill("missingContext"),
			extra: new Array(98).fill(0),
		});
		expect(overCap.isError).toBe(true);
		expect(overCap.text).toContain("maximum of 200");
	});

	test("accepts the largest legitimate review call", async () => {
		const { client } = await startServer({ "readme-review.yaml": README_YAML });
		const res = await call(client, "review_readme_content", {
			checkpoints: new Array(50).fill("opening"),
			focus: new Array(50).fill("missingContext"),
		});
		expect(res.isError).toBeFalsy();
	});
});

// A bucket whose list() can be paged, delayed, or made to fail.
function scriptedBucket(
	pages: Array<{ keys: string[]; truncated: boolean }>,
	options: { failFirst?: boolean; delayMs?: number } = {},
) {
	const calls = { list: 0 };
	let failed = false;
	const bucket = {
		async list(opts?: { cursor?: string }) {
			calls.list += 1;
			if (options.failFirst && !failed) {
				failed = true;
				throw new Error("R2 unavailable");
			}
			if (options.delayMs) {
				await new Promise((r) => setTimeout(r, options.delayMs));
			}
			const index = opts?.cursor ? Number(opts.cursor) : 0;
			const page = pages[index];
			return {
				objects: page.keys.map((key) => ({ key })),
				truncated: page.truncated,
				cursor: page.truncated ? String(index + 1) : undefined,
			};
		},
		async head() {
			return null;
		},
		async get() {
			return null;
		},
	};
	return { bucket, calls };
}

describe("bucket listing behavior", () => {
	test("concurrent misses share one listing", async () => {
		now += LIST_CACHE_TTL_MS + 1;
		const { ExpertiseMCP } = await import("../src/index");
		const { bucket, calls } = scriptedBucket(
			[{ keys: ["readme-review.yaml"], truncated: false }],
			{ delayMs: 20 },
		);
		// Three sessions starting at once against a cold cache.
		const agents = [1, 2, 3].map(
			// biome-ignore lint/suspicious/noExplicitAny: stubbed base class takes (ctx, env)
			() => new (ExpertiseMCP as any)({}, { EXPERTISE_BUCKET: bucket }),
		);
		await Promise.all(agents.map((a) => a.init()));
		expect(calls.list).toBe(1);
	});

	test("a failed listing is not cached and the next call retries", async () => {
		now += LIST_CACHE_TTL_MS + 1;
		const { ExpertiseMCP } = await import("../src/index");
		const { bucket, calls } = scriptedBucket(
			[{ keys: ["readme-review.yaml"], truncated: false }],
			{ failFirst: true },
		);
		// biome-ignore lint/suspicious/noExplicitAny: stubbed base class takes (ctx, env)
		const agent = new (ExpertiseMCP as any)({}, { EXPERTISE_BUCKET: bucket });
		await expect(agent.init()).rejects.toThrow("R2 unavailable");
		// biome-ignore lint/suspicious/noExplicitAny: stubbed base class takes (ctx, env)
		const second = new (ExpertiseMCP as any)({}, { EXPERTISE_BUCKET: bucket });
		await second.init();
		expect(calls.list).toBe(2);
	});

	test("an empty bucket registers only get_status", async () => {
		const { client } = await startServer({});
		const { tools } = await client.listTools();
		expect(tools.map((t) => t.name)).toEqual(["get_status"]);
	});

	test("follows pagination and ignores non-yaml keys", async () => {
		now += LIST_CACHE_TTL_MS + 1;
		const { ExpertiseMCP } = await import("../src/index");
		const { bucket, calls } = scriptedBucket([
			{ keys: ["notes.txt"], truncated: true },
			{ keys: ["readme-review.yaml"], truncated: true },
			{ keys: ["image.png"], truncated: false },
		]);
		// The get() stub returns null, so init() finds the file name but no content.
		// biome-ignore lint/suspicious/noExplicitAny: stubbed base class takes (ctx, env)
		const agent = new (ExpertiseMCP as any)({}, { EXPERTISE_BUCKET: bucket });
		await agent.init();
		expect(calls.list).toBe(3);
		// The listing is cached: a second init() within the TTL lists nothing new.
		// biome-ignore lint/suspicious/noExplicitAny: stubbed base class takes (ctx, env)
		const again = new (ExpertiseMCP as any)({}, { EXPERTISE_BUCKET: bucket });
		await again.init();
		expect(calls.list).toBe(3);
	});
});

describe("bucket listing cache", () => {
	test("get_capabilities reuses the listing within the TTL and refreshes after it", async () => {
		const { client, calls } = await startServer({ "readme-review.yaml": README_YAML });
		expect(calls.list).toBe(1); // init()
		await call(client, "get_capabilities", {});
		await call(client, "get_capabilities", {});
		now += LIST_CACHE_TTL_MS - 1;
		await call(client, "get_capabilities", {});
		expect(calls.list).toBe(1);
		now += 2;
		const res = await call(client, "get_capabilities", {});
		expect(calls.list).toBe(2);
		expect(res.text).toContain("README Review");
	});
});
