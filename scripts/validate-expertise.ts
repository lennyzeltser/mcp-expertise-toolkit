#!/usr/bin/env bun
/**
 * Validate expertise YAML files against the schema.
 *
 * Usage:
 *   bun scripts/validate-expertise.ts           # Validates all .yaml files in content/
 *   bun scripts/validate-expertise.ts [path]    # Validates a specific file
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
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

function validateFile(filePath: string): boolean {
	console.log("");
	log("blue", `Validating: ${filePath}`);
	console.log("");

	// Check file exists
	if (!existsSync(filePath)) {
		log("red", `Error: File not found: ${filePath}`);
		return false;
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
		return false;
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
		return false;
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
	return true;
}

function main() {
	const args = process.argv.slice(2);

	// If a specific file is provided, validate just that file
	if (args[0]) {
		const filePath = resolve(process.cwd(), args[0]);
		const success = validateFile(filePath);
		process.exit(success ? 0 : 1);
	}

	// Otherwise, validate all .yaml files in content/
	const contentDir = resolve(process.cwd(), "content");
	if (!existsSync(contentDir)) {
		log("red", "Error: content/ directory not found");
		process.exit(1);
	}

	const yamlFiles = readdirSync(contentDir).filter((f) => f.endsWith(".yaml"));

	if (yamlFiles.length === 0) {
		log("yellow", "No .yaml files found in content/");
		process.exit(0);
	}

	console.log("");
	log("blue", `Found ${yamlFiles.length} YAML file(s) in content/`);

	let allPassed = true;
	const prefixes = new Set<string>();
	const collisions: string[] = [];

	for (const file of yamlFiles) {
		const filePath = join(contentDir, file);
		const success = validateFile(filePath);
		if (!success) {
			allPassed = false;
		} else {
			// Check for prefix collisions
			const yamlText = readFileSync(filePath, "utf-8");
			const data = YAML.parse(yamlText);
			const prefix = data.meta?.toolPrefix;
			if (prefix) {
				if (prefixes.has(prefix)) {
					collisions.push(`${file} uses toolPrefix "${prefix}" which is already used`);
				}
				prefixes.add(prefix);
			}
		}
	}

	// Report prefix collisions
	if (collisions.length > 0) {
		console.log("");
		log("red", "Prefix collisions detected:");
		for (const c of collisions) {
			console.log(`  - ${c}`);
		}
		allPassed = false;
	}

	console.log("");
	console.log("═".repeat(60));
	if (allPassed) {
		log("green", `All ${yamlFiles.length} file(s) validated successfully!`);
	} else {
		log("red", "Some validations failed. See above for details.");
	}

	process.exit(allPassed ? 0 : 1);
}

main();
