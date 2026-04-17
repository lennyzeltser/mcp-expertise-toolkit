import { z } from "zod";

// ============================================================================
// Attribution Types
// Optional fields that let any section credit an external author. Designed to
// stay in sync with downstream forks that extend this schema.
// ============================================================================

/**
 * Attribution type for sections, subsections, or items.
 * Default when absent is treated as "self-authored".
 */
export type AttributionType =
	| "self-authored"
	| "self-derived"
	| "external-reference"
	| "external-paraphrased"
	| "external-licensed";

/**
 * Attribution metadata that can apply to any section in the expertise file.
 * All fields are optional; a section-level `license` overrides `meta.license`
 * for that scope.
 */
export interface Attribution {
	/** Original author when this section paraphrases or references someone else's work */
	originalAuthor?: string;
	/** URL of the original source */
	sourceUrl?: string;
	/** How this section relates to external content (see AttributionType) */
	attributionType?: AttributionType;
	/** Section-scoped license override */
	license?: string;
}

/**
 * An item inside a string-array field (e.g., `guidelines`) that carries its
 * own attribution. Plain strings remain valid; this shape is opt-in.
 */
export interface AttributedItem {
	text: string;
	attribution?: string;
}

/**
 * Any item in a guideline list: plain string or attributed item.
 */
export type Guideline = string | AttributedItem;

// ============================================================================
// Expertise Content Types
// These define the structure of your expertise YAML file
// ============================================================================

/**
 * Metadata about your expertise domain.
 */
export interface ExpertiseMeta {
	/** Domain name (e.g., "Writing Feedback", "Code Review") */
	domain: string;
	/** Your name or organization */
	author: string;
	/** Brief description of what this expertise covers */
	description: string;
	/** License for the expertise content (e.g., "CC BY 4.0", "MIT") */
	license?: string;
	/**
	 * Optional policy describing how the file handles external authorship.
	 * Set this when some sections are authored by others and use the
	 * section-level Attribution fields.
	 */
	attributionPolicy?: string;
	/** URL for more information (optional) */
	infoUrl?: string;
	/** Tool prefix for MCP tool naming (e.g., "writing" -> "load_writing_context") */
	toolPrefix: string;
	/** Privacy statement shown to users */
	privacyStatement?: string;
}

/**
 * A core principle in your domain (like the "Five Elements" of good writing).
 * Principles are high-level guidelines that apply broadly.
 */
export interface Principle extends Attribution {
	/** Principle name (e.g., "Clarity", "Tone", "Structure") */
	name: string;
	/** Brief description of this principle */
	description?: string;
	/** Specific guidelines under this principle. Each item may be a plain string or an AttributedItem. */
	guidelines: Guideline[];
	/** Examples showing bad vs good (optional) */
	examples?: Array<{
		bad: string;
		good: string;
		explanation?: string;
	}>;
}

/**
 * A checkpoint is something to verify in the content being reviewed.
 * (Generalized from IR "fieldGuidance" - what required sections/elements to check)
 *
 * Key design: Use semantic descriptions, not keywords. AI understands meaning.
 */
export interface Checkpoint extends Attribution {
	/** Unique identifier (e.g., "introduction", "conclusion") */
	id: string;
	/** Human-readable name */
	name: string;
	/** Why this checkpoint matters */
	purpose: string;
	/** Semantic description of what indicates this is covered (concepts, not keywords) */
	whatIndicatesPresence: string[];
	/** Common problems when this is missing or incomplete */
	commonProblems: string[];
	/** Questions to ask if this appears missing */
	clarifyingQuestions?: string[];
	/** Example of good coverage (optional) */
	exampleGood?: string;
	/** Example of poor/incomplete coverage (optional) */
	examplePoor?: string;
}

/**
 * A category of content within your domain.
 * (Generalized from IR "incidentTypes" - different types of things being reviewed)
 */
export interface Category extends Attribution {
	/** Unique identifier (e.g., "technical", "narrative", "persuasive") */
	id: string;
	/** Human-readable name */
	name: string;
	/** Description of this category */
	description: string;
	/** Semantic indicators that suggest this category (concepts, not keywords) */
	indicators: string[];
	/** Category-specific considerations */
	considerations: string[];
	/** Common patterns in this category */
	commonPatterns?: string[];
}

/**
 * A quality check with examples of bad vs good.
 */
export interface QualityCheckCategory extends Attribution {
	/** What to look for */
	whatToCheck: string;
	/** Why this matters */
	whyItMatters: string;
	/** Examples showing transformations */
	examples: Array<{
		bad: string;
		good: string;
		explanation?: string;
	}>;
}

/**
 * Quality checks for different aspects of content.
 * Customize the categories for your domain.
 */
export interface QualityChecks {
	/** Key-value pairs of quality check categories */
	[category: string]: QualityCheckCategory;
}

/**
 * Guidance for providing constructive feedback/review.
 */
export interface ReviewGuidance {
	/** Purpose of this guidance */
	purpose?: string;
	/** How to structure feedback */
	feedbackStructure: string[];
	/** Mindset for providing constructive feedback */
	reviewerMindset?: string[];
	/** Tone guidance for feedback */
	tone: string[];
}

/**
 * Requirements or external constraints (like regulatory requirements).
 * Optional - only include if your domain has external requirements.
 */
export interface Requirement extends Attribution {
	/** Requirement name (e.g., "GDPR", "Style Guide") */
	name: string;
	/** When this applies */
	triggers: string[];
	/** Brief description */
	description: string;
	/** Important caveats */
	caveats?: string[];
}

/**
 * Complete expertise content structure.
 * This is the shape of your expertise YAML file.
 */
export interface ExpertiseContent {
	/** Schema version */
	version: string;
	/** Domain metadata */
	meta: ExpertiseMeta;
	/** Core principles (high-level guidelines) */
	principles: Principle[];
	/** Checkpoints to verify (required elements/sections) */
	checkpoints: Checkpoint[];
	/** Content categories (types of content) */
	categories?: Category[];
	/** Quality checks with examples */
	qualityChecks?: QualityChecks;
	/** Guidance for reviewing/critiquing */
	reviewGuidance: ReviewGuidance;
	/** External requirements (optional) */
	requirements?: Requirement[];
}

// ============================================================================
// AI Context Types
// These define what the MCP tools return to the AI assistant
// ============================================================================

/**
 * AI-consumable context for creating/improving content.
 * Response format for load_expertise_context tool.
 */
export interface ExpertiseContext {
	/** Schema version */
	version: string;
	/** Generated timestamp */
	generated: string;
	/** Metadata */
	meta: {
		domain: string;
		author: string;
		license?: string;
		privacyStatement: string;
		infoUrl?: string;
	};
	/** Instructions for how AI should use this context */
	instructions: string;
	/** Completeness checking guidance */
	completeness?: {
		assessmentGuidance: string;
		checkpoints: Checkpoint[];
	};
	/** Category identification guidance */
	categories?: Category[];
	/** Core principles */
	principles?: Principle[];
	/** Quality checks */
	qualityChecks?: QualityChecks;
	/** Requirements/constraints */
	requirements?: Requirement[];
}

/**
 * AI-consumable context for reviewing existing content.
 * Response format for review_content tool.
 */
export interface ReviewContext {
	/** Schema version */
	version: string;
	/** Generated timestamp */
	generated: string;
	/** Metadata */
	meta: {
		domain: string;
		author: string;
		license?: string;
		privacyStatement: string;
	};
	/** Instructions for the review */
	reviewInstructions: string;
	/** How to provide feedback */
	feedbackGuidance: ReviewGuidance;
	/** Checkpoints to verify */
	checkpoints?: Checkpoint[];
	/** Quality checks to apply */
	qualityChecks?: QualityChecks;
	/** Principles to reference */
	principles?: Principle[];
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

/**
 * AttributionType enum. Keep values aligned across adopters so that tools
 * built on this template can share the same vocabulary.
 */
export const AttributionTypeSchema = z.enum([
	"self-authored",
	"self-derived",
	"external-reference",
	"external-paraphrased",
	"external-licensed",
]);

/**
 * Attribution fields that can be spread into any section schema.
 */
export const AttributionFields = {
	originalAuthor: z.string().min(1).optional(),
	sourceUrl: z.string().min(1).optional(),
	attributionType: AttributionTypeSchema.optional(),
	license: z.string().min(1).optional(),
} as const;

export const AttributedItemSchema = z.object({
	text: z.string().min(1),
	attribution: z.string().min(1).optional(),
});

export const GuidelineSchema = z.union([
	z.string().min(1),
	AttributedItemSchema,
]);

export const ExpertiseMetaSchema = z.object({
	domain: z.string().min(1, "Domain name is required"),
	author: z.string().min(1, "Author is required"),
	description: z.string().min(1, "Description is required"),
	license: z.string().optional(),
	attributionPolicy: z.string().min(1).optional(),
	infoUrl: z.string().url().optional(),
	toolPrefix: z
		.string()
		.regex(
			/^[a-z][a-z0-9_]*$/,
			"Tool prefix must be lowercase alphanumeric with underscores, starting with a letter",
		),
	privacyStatement: z.string().optional(),
});

export const PrincipleSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	guidelines: z.array(GuidelineSchema).min(1, "At least one guideline required"),
	examples: z
		.array(
			z.object({
				bad: z.string(),
				good: z.string(),
				explanation: z.string().optional(),
			}),
		)
		.optional(),
	...AttributionFields,
});

export const CheckpointSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	purpose: z.string().min(1),
	whatIndicatesPresence: z.array(z.string()).min(1),
	commonProblems: z.array(z.string()),
	clarifyingQuestions: z.array(z.string()).optional(),
	exampleGood: z.string().optional(),
	examplePoor: z.string().optional(),
	...AttributionFields,
});

export const CategorySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().min(1),
	indicators: z.array(z.string()),
	considerations: z.array(z.string()),
	commonPatterns: z.array(z.string()).optional(),
	...AttributionFields,
});

export const QualityCheckCategorySchema = z.object({
	whatToCheck: z.string(),
	whyItMatters: z.string(),
	examples: z.array(
		z.object({
			bad: z.string(),
			good: z.string(),
			explanation: z.string().optional(),
		}),
	),
	...AttributionFields,
});

export const QualityChecksSchema = z.record(
	z.string(),
	QualityCheckCategorySchema,
);

export const ReviewGuidanceSchema = z.object({
	purpose: z.string().optional(),
	feedbackStructure: z.array(z.string()).min(1),
	reviewerMindset: z.array(z.string()).optional(),
	tone: z.array(z.string()).min(1),
});

export const RequirementSchema = z.object({
	name: z.string().min(1),
	triggers: z.array(z.string()),
	description: z.string(),
	caveats: z.array(z.string()).optional(),
	...AttributionFields,
});

export const ExpertiseContentSchema = z.object({
	version: z.string().min(1),
	meta: ExpertiseMetaSchema,
	principles: z.array(PrincipleSchema).min(1, "At least one principle required"),
	checkpoints: z
		.array(CheckpointSchema)
		.min(1, "At least one checkpoint required"),
	categories: z.array(CategorySchema).optional(),
	qualityChecks: QualityChecksSchema.optional(),
	reviewGuidance: ReviewGuidanceSchema,
	requirements: z.array(RequirementSchema).optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the tool prefix from expertise metadata.
 */
export function getToolPrefix(meta: ExpertiseMeta): string {
	return meta.toolPrefix;
}

/**
 * Render a Guideline item as a string. Plain strings pass through; attributed
 * items become "text — *attribution*" so the source stays visible in output.
 */
export function renderGuideline(item: Guideline): string {
	if (typeof item === "string") return item;
	return item.attribution ? `${item.text} — *${item.attribution}*` : item.text;
}

/**
 * Default privacy statement if not provided.
 */
export const DEFAULT_PRIVACY_STATEMENT =
	"This tool returns guidelines for your AI to analyze locally. Your content is never sent to this server.";
