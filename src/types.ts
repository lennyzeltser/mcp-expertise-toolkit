import { z } from "zod";

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
export interface Principle {
	/** Principle name (e.g., "Clarity", "Tone", "Structure") */
	name: string;
	/** Brief description of this principle */
	description?: string;
	/** Specific guidelines under this principle */
	guidelines: string[];
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
export interface Checkpoint {
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
export interface Category {
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
export interface QualityCheckCategory {
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
export interface Requirement {
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

export const ExpertiseMetaSchema = z.object({
	domain: z.string().min(1, "Domain name is required"),
	author: z.string().min(1, "Author is required"),
	description: z.string().min(1, "Description is required"),
	license: z.string().optional(),
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
	guidelines: z.array(z.string()).min(1, "At least one guideline required"),
	examples: z
		.array(
			z.object({
				bad: z.string(),
				good: z.string(),
				explanation: z.string().optional(),
			}),
		)
		.optional(),
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
});

export const CategorySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().min(1),
	indicators: z.array(z.string()),
	considerations: z.array(z.string()),
	commonPatterns: z.array(z.string()).optional(),
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
 * Default privacy statement if not provided.
 */
export const DEFAULT_PRIVACY_STATEMENT =
	"This tool returns guidelines for your AI to analyze locally. Your content is never sent to this server.";
