import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "..");
const VALIDATOR = resolve(REPO_ROOT, "scripts/validate-expertise.ts");
const FIXTURE_DIR = resolve(REPO_ROOT, "tests/fixtures");
const CONTENT_DIR = resolve(REPO_ROOT, "content");

async function runValidator(
	path: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn({
		cmd: ["bun", VALIDATOR, path],
		cwd: REPO_ROOT,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { code, stdout, stderr };
}

describe("validate-expertise.ts — fixtures", () => {
	test("valid-external-attribution.yaml passes", async () => {
		const { code, stdout } = await runValidator(
			`${FIXTURE_DIR}/valid-external-attribution.yaml`,
		);
		expect(code).toBe(0);
		expect(stdout).toContain("Validation passed");
		expect(stdout).toContain("Externally-attributed items: 1");
	});

	test("invalid-attribution-type.yaml fails with attributionType error", async () => {
		const { code, stdout, stderr } = await runValidator(
			`${FIXTURE_DIR}/invalid-attribution-type.yaml`,
		);
		expect(code).toBe(1);
		const combined = stdout + stderr;
		expect(combined).toContain("Validation failed");
		expect(combined).toContain("attributionType");
	});

	test("external-without-source.yaml passes but emits warning", async () => {
		const { code, stdout } = await runValidator(
			`${FIXTURE_DIR}/external-without-source.yaml`,
		);
		expect(code).toBe(0);
		expect(stdout).toContain("Validation passed");
		expect(stdout).toContain("Suggestions");
		expect(stdout).toContain(
			"uses external attribution but has no originalAuthor or sourceUrl",
		);
	});
});

describe("validate-expertise.ts — regression on existing samples", () => {
	test("content/_starter-template.yaml still validates", async () => {
		const { code, stdout } = await runValidator(
			`${CONTENT_DIR}/_starter-template.yaml`,
		);
		expect(code).toBe(0);
		expect(stdout).toContain("Validation passed");
	});

	test("content/readme-review.yaml still validates", async () => {
		const { code, stdout } = await runValidator(
			`${CONTENT_DIR}/readme-review.yaml`,
		);
		expect(code).toBe(0);
		expect(stdout).toContain("Validation passed");
	});

	test("content/bbq-scoring.yaml still validates", async () => {
		const { code, stdout } = await runValidator(
			`${CONTENT_DIR}/bbq-scoring.yaml`,
		);
		expect(code).toBe(0);
		expect(stdout).toContain("Validation passed");
	});
});
