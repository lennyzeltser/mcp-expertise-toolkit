#!/usr/bin/env bun
/**
 * Validate an expertise YAML file against the schema.
 *
 * Usage:
 *   bun scripts/validate-expertise.ts [path-to-yaml]
 *
 * If no path is provided, validates content/writing-feedback.yaml
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { ExpertiseContentSchema } from "../src/types";

const COLORS = {
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	reset: "\x1b[0m",
	bold: "\x1b[1m",
};

function log(color: keyof typeof COLORS, message: string) {
	console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function main() {
	const args = process.argv.slice(2);
	const inputPath = args[0] || "content/writing-feedback.yaml";
	const filePath = resolve(process.cwd(), inputPath);

	console.log("");
	log("blue", `Validating: ${filePath}`);
	console.log("");

	// Check file exists
	if (!existsSync(filePath)) {
		log("red", `Error: File not found: ${filePath}`);
		process.exit(1);
	}

	// Read and parse YAML
	let content: unknown;
	try {
		const yamlText = readFileSync(filePath, "utf-8");
		content = YAML.parse(yamlText);
	} catch (error) {
		log("red", `Error: Failed to parse YAML`);
		if (error instanceof Error) {
			console.error(error.message);
		}
		process.exit(1);
	}

	// Validate with Zod
	const result = ExpertiseContentSchema.safeParse(content);

	if (!result.success) {
		log("red", "Validation failed!");
		console.log("");

		for (const issue of result.error.issues) {
			const path = issue.path.join(".");
			log("yellow", `  ${path || "(root)"}: ${issue.message}`);
		}

		console.log("");
		log("red", `Found ${result.error.issues.length} issue(s)`);
		process.exit(1);
	}

	// Validation passed - show summary
	log("green", "Validation passed!");
	console.log("");

	const data = result.data;
	console.log(`  Domain: ${data.meta.domain}`);
	console.log(`  Author: ${data.meta.author}`);
	console.log(`  Tool Prefix: ${data.meta.toolPrefix}`);
	console.log("");
	console.log(`  Principles: ${data.principles.length}`);
	console.log(`  Checkpoints: ${data.checkpoints.length}`);
	console.log(`  Categories: ${data.categories?.length || 0}`);
	console.log(
		`  Quality Checks: ${data.qualityChecks ? Object.keys(data.qualityChecks).length : 0}`,
	);
	console.log(`  Requirements: ${data.requirements?.length || 0}`);
	console.log("");

	// Warnings for optional fields
	const warnings: string[] = [];

	if (!data.meta.privacyStatement) {
		warnings.push("No privacyStatement - default will be used");
	}
	if (!data.meta.infoUrl) {
		warnings.push("No infoUrl - consider adding a link for more info");
	}
	if (!data.categories || data.categories.length === 0) {
		warnings.push("No categories defined - consider adding content types");
	}
	if (!data.qualityChecks || Object.keys(data.qualityChecks).length === 0) {
		warnings.push("No qualityChecks defined - consider adding specific checks");
	}

	// Check for examples
	let hasCheckpointExamples = false;
	let hasPrincipleExamples = false;

	for (const cp of data.checkpoints) {
		if (cp.exampleGood || cp.examplePoor) {
			hasCheckpointExamples = true;
			break;
		}
	}

	for (const p of data.principles) {
		if (p.examples && p.examples.length > 0) {
			hasPrincipleExamples = true;
			break;
		}
	}

	if (!hasCheckpointExamples) {
		warnings.push(
			"No checkpoint examples - consider adding exampleGood/examplePoor",
		);
	}
	if (!hasPrincipleExamples) {
		warnings.push("No principle examples - consider adding examples array");
	}

	if (warnings.length > 0) {
		log("yellow", "Suggestions:");
		for (const w of warnings) {
			console.log(`  - ${w}`);
		}
		console.log("");
	}

	// Show generated tool names
	log("blue", "MCP Tools that will be created:");
	console.log(`  - load_${data.meta.toolPrefix}_context`);
	console.log(`  - review_${data.meta.toolPrefix}_content`);
	console.log(`  - get_${data.meta.toolPrefix}_guidelines`);
	console.log(`  - get_capabilities`);
	console.log("");

	log("green", "Ready to deploy!");
}

main();
