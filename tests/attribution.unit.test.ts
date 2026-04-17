import { describe, expect, test } from "bun:test";
import {
	AttributedItemSchema,
	AttributionTypeSchema,
	CategorySchema,
	CheckpointSchema,
	ExpertiseContentSchema,
	ExpertiseMetaSchema,
	GuidelineSchema,
	PrincipleSchema,
	QualityCheckCategorySchema,
	RequirementSchema,
	ScaleSchema,
	renderGuideline,
} from "../src/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validMeta(overrides: Record<string, unknown> = {}) {
	return {
		domain: "Example",
		author: "Generic Author",
		description: "Fixture.",
		toolPrefix: "example",
		...overrides,
	};
}

function validPrinciple(overrides: Record<string, unknown> = {}) {
	return {
		name: "Principle",
		guidelines: ["A plain guideline."],
		...overrides,
	};
}

function validCheckpoint(overrides: Record<string, unknown> = {}) {
	return {
		id: "cp_1",
		name: "CP One",
		purpose: "Verify something.",
		whatIndicatesPresence: ["Indicator"],
		commonProblems: [],
		...overrides,
	};
}

function validContent(overrides: Record<string, unknown> = {}) {
	return {
		version: "1.0.0",
		meta: validMeta(),
		principles: [validPrinciple()],
		checkpoints: [validCheckpoint()],
		reviewGuidance: {
			feedbackStructure: ["Strengths first."],
			tone: ["Constructive."],
		},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// AttributionType enum
// ---------------------------------------------------------------------------

describe("AttributionTypeSchema", () => {
	const validValues = [
		"self-authored",
		"self-derived",
		"external-reference",
		"external-paraphrased",
		"external-licensed",
	] as const;

	for (const value of validValues) {
		test(`accepts "${value}"`, () => {
			expect(AttributionTypeSchema.safeParse(value).success).toBe(true);
		});
	}

	test("rejects bogus value", () => {
		const result = AttributionTypeSchema.safeParse("made-up-value");
		expect(result.success).toBe(false);
	});

	test("rejects empty string", () => {
		const result = AttributionTypeSchema.safeParse("");
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// AttributedItem and Guideline union
// ---------------------------------------------------------------------------

describe("AttributedItemSchema", () => {
	test("accepts text only", () => {
		const result = AttributedItemSchema.safeParse({ text: "hello" });
		expect(result.success).toBe(true);
	});

	test("accepts text + attribution", () => {
		const result = AttributedItemSchema.safeParse({
			text: "hello",
			attribution: "Someone",
		});
		expect(result.success).toBe(true);
	});

	test("rejects empty text", () => {
		const result = AttributedItemSchema.safeParse({ text: "" });
		expect(result.success).toBe(false);
	});
});

describe("GuidelineSchema union", () => {
	test("accepts a plain string", () => {
		expect(GuidelineSchema.safeParse("guideline text").success).toBe(true);
	});

	test("accepts an AttributedItem", () => {
		expect(
			GuidelineSchema.safeParse({ text: "guideline", attribution: "X" })
				.success,
		).toBe(true);
	});

	test("rejects an empty string", () => {
		expect(GuidelineSchema.safeParse("").success).toBe(false);
	});

	test("rejects an AttributedItem with empty text", () => {
		expect(
			GuidelineSchema.safeParse({ text: "", attribution: "X" }).success,
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// meta.attributionPolicy
// ---------------------------------------------------------------------------

describe("ExpertiseMetaSchema — attributionPolicy", () => {
	test("accepts meta without attributionPolicy (backward compat)", () => {
		expect(ExpertiseMetaSchema.safeParse(validMeta()).success).toBe(true);
	});

	test("accepts meta with attributionPolicy string", () => {
		expect(
			ExpertiseMetaSchema.safeParse(
				validMeta({ attributionPolicy: "We attribute external authors." }),
			).success,
		).toBe(true);
	});

	test("rejects empty attributionPolicy string", () => {
		expect(
			ExpertiseMetaSchema.safeParse(validMeta({ attributionPolicy: "" }))
				.success,
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Section-level attribution fields
// ---------------------------------------------------------------------------

describe("PrincipleSchema — attribution fields", () => {
	test("accepts a principle with no attribution fields (backward compat)", () => {
		expect(PrincipleSchema.safeParse(validPrinciple()).success).toBe(true);
	});

	test("accepts a principle with all four attribution fields", () => {
		const principle = validPrinciple({
			originalAuthor: "Generic Author",
			sourceUrl: "https://example.com/framework",
			attributionType: "external-paraphrased",
			license: "Framework by Generic Author",
		});
		expect(PrincipleSchema.safeParse(principle).success).toBe(true);
	});

	test("rejects a principle with invalid attributionType", () => {
		const principle = validPrinciple({ attributionType: "bogus" });
		const result = PrincipleSchema.safeParse(principle);
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("attributionType"))).toBe(true);
		}
	});

	test("accepts guidelines as mixed strings and AttributedItems", () => {
		const principle = {
			name: "Mixed",
			guidelines: [
				"Plain string guideline.",
				{ text: "Attributed guideline.", attribution: "Generic Author" },
			],
		};
		expect(PrincipleSchema.safeParse(principle).success).toBe(true);
	});
});

describe("CheckpointSchema — attribution fields", () => {
	test("accepts a checkpoint with no attribution (backward compat)", () => {
		expect(CheckpointSchema.safeParse(validCheckpoint()).success).toBe(true);
	});

	test("accepts a checkpoint with external-paraphrased attribution", () => {
		const cp = validCheckpoint({
			originalAuthor: "Generic Author",
			attributionType: "external-paraphrased",
		});
		expect(CheckpointSchema.safeParse(cp).success).toBe(true);
	});

	test("rejects a checkpoint with invalid attributionType", () => {
		const cp = validCheckpoint({ attributionType: "nonsense" });
		expect(CheckpointSchema.safeParse(cp).success).toBe(false);
	});
});

describe("CategorySchema — attribution fields", () => {
	test("accepts a category with attribution fields", () => {
		const cat = {
			id: "cat_1",
			name: "Cat",
			description: "Desc",
			indicators: ["x"],
			considerations: ["y"],
			originalAuthor: "Generic Author",
			attributionType: "external-reference",
		};
		expect(CategorySchema.safeParse(cat).success).toBe(true);
	});
});

describe("RequirementSchema — attribution fields", () => {
	test("accepts a requirement with attribution fields", () => {
		const req = {
			name: "Req",
			triggers: ["t"],
			description: "desc",
			sourceUrl: "https://example.com/req",
			attributionType: "external-licensed",
		};
		expect(RequirementSchema.safeParse(req).success).toBe(true);
	});
});

describe("QualityCheckCategorySchema — attribution fields", () => {
	test("accepts a quality check with attribution fields", () => {
		const qc = {
			whatToCheck: "x",
			whyItMatters: "y",
			examples: [{ bad: "b", good: "g" }],
			originalAuthor: "Generic Author",
			attributionType: "external-paraphrased",
		};
		expect(QualityCheckCategorySchema.safeParse(qc).success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Full-document acceptance
// ---------------------------------------------------------------------------

describe("ExpertiseContentSchema — end-to-end", () => {
	test("accepts a minimal valid document (no attribution anywhere)", () => {
		expect(ExpertiseContentSchema.safeParse(validContent()).success).toBe(true);
	});

	test("accepts a document with meta.attributionPolicy and section attribution", () => {
		const content = validContent({
			meta: validMeta({
				attributionPolicy: "Attribution policy string.",
			}),
			principles: [
				validPrinciple({
					originalAuthor: "Generic Author",
					sourceUrl: "https://example.com/framework",
					attributionType: "external-paraphrased",
				}),
			],
		});
		expect(ExpertiseContentSchema.safeParse(content).success).toBe(true);
	});

	test("rejects a document with invalid attributionType deep inside a principle", () => {
		const content = validContent({
			principles: [validPrinciple({ attributionType: "invalid" })],
		});
		expect(ExpertiseContentSchema.safeParse(content).success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// renderGuideline helper
// ---------------------------------------------------------------------------

describe("renderGuideline", () => {
	test("passes through a plain string", () => {
		expect(renderGuideline("hello")).toBe("hello");
	});

	test("renders an AttributedItem with attribution", () => {
		expect(
			renderGuideline({ text: "hello", attribution: "Generic Author" }),
		).toBe("hello — *Generic Author*");
	});

	test("renders an AttributedItem without attribution as plain text", () => {
		expect(renderGuideline({ text: "hello" })).toBe("hello");
	});

	test("renders a scale block beneath the item", () => {
		const output = renderGuideline({
			text: "Dimension",
			attribution: "Rubric Author",
			scale: [
				{ score: 1, label: "low", text: "Bad." },
				{ score: 2, label: "mid", text: "Medium." },
				{ score: 3, label: "high", text: "Good." },
			],
		});
		expect(output).toBe(
			"Dimension — *Rubric Author*\n" +
				"  - 1 (low): Bad.\n" +
				"  - 2 (mid): Medium.\n" +
				"  - 3 (high): Good.",
		);
	});

	test("renders a scale block without attribution on the head item", () => {
		const output = renderGuideline({
			text: "Dimension",
			scale: [{ score: 1, label: "low", text: "Bad." }],
		});
		expect(output).toBe("Dimension\n  - 1 (low): Bad.");
	});

	test("renders per-level attribution suffix when set", () => {
		const output = renderGuideline({
			text: "Dimension",
			scale: [
				{
					score: 1,
					label: "low",
					text: "Bad.",
					attribution: "Level Author",
				},
			],
		});
		expect(output).toBe("Dimension\n  - 1 (low): Bad. — *Level Author*");
	});
});

// ---------------------------------------------------------------------------
// ScaleSchema and AttributedItem.scale
// ---------------------------------------------------------------------------

describe("ScaleSchema", () => {
	test("accepts a valid level", () => {
		expect(
			ScaleSchema.safeParse({ score: 1, label: "low", text: "Bad." }).success,
		).toBe(true);
	});

	test("accepts a level with per-level attribution", () => {
		expect(
			ScaleSchema.safeParse({
				score: 2,
				label: "mid",
				text: "Medium.",
				attribution: "Level Author",
			}).success,
		).toBe(true);
	});

	test("rejects a level with a non-integer score", () => {
		expect(
			ScaleSchema.safeParse({ score: 1.5, label: "low", text: "Bad." }).success,
		).toBe(false);
	});

	test("rejects a level with an empty label", () => {
		expect(
			ScaleSchema.safeParse({ score: 1, label: "", text: "Bad." }).success,
		).toBe(false);
	});

	test("rejects a level with empty text", () => {
		expect(
			ScaleSchema.safeParse({ score: 1, label: "low", text: "" }).success,
		).toBe(false);
	});

	test("rejects a level missing required fields", () => {
		expect(ScaleSchema.safeParse({ score: 1, label: "low" }).success).toBe(
			false,
		);
		expect(ScaleSchema.safeParse({ label: "low", text: "Bad." }).success).toBe(
			false,
		);
	});
});

describe("AttributedItemSchema — scale", () => {
	test("accepts an item with a valid scale array", () => {
		const result = AttributedItemSchema.safeParse({
			text: "Dimension",
			attribution: "Author",
			scale: [
				{ score: 1, label: "low", text: "Bad." },
				{ score: 2, label: "mid", text: "Medium." },
				{ score: 3, label: "high", text: "Good." },
			],
		});
		expect(result.success).toBe(true);
	});

	test("accepts an item without a scale (backward compat)", () => {
		expect(
			AttributedItemSchema.safeParse({
				text: "Item",
				attribution: "Author",
			}).success,
		).toBe(true);
	});

	test("rejects an item with an empty scale array", () => {
		expect(
			AttributedItemSchema.safeParse({ text: "Item", scale: [] }).success,
		).toBe(false);
	});

	test("rejects an item with an invalid level inside scale", () => {
		const result = AttributedItemSchema.safeParse({
			text: "Item",
			scale: [{ score: 1, label: "low" }],
		});
		expect(result.success).toBe(false);
	});
});
