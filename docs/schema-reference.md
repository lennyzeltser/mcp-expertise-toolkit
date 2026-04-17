# Schema Reference

Complete documentation for the expertise YAML format.

## Overview

Your expertise file is a YAML document with this structure:

```yaml
version: "1.0.0"
meta: { ... }           # Required: Domain metadata
principles: [ ... ]     # Required: High-level guidelines
checkpoints: [ ... ]    # Required: Things to verify
categories: [ ... ]     # Optional: Content types
qualityChecks: { ... }  # Optional: Specific checks with examples
reviewGuidance: { ... } # Required: How to provide feedback
requirements: [ ... ]   # Optional: External constraints
```

## meta (Required)

Metadata about your expertise domain.

```yaml
meta:
  domain: "Writing Feedback"        # Required: Domain name
  author: "Your Name"               # Required: Your name or org
  description: "What this covers"   # Required: Brief description
  license: "CC BY 4.0"              # Optional: Content license
  toolPrefix: "writing"             # Required: Used in tool names
  privacyStatement: "..."           # Optional: Custom privacy note
  infoUrl: "https://..."            # Optional: Link for more info
```

### toolPrefix

The `toolPrefix` determines your tool names:

- `toolPrefix: "writing"` → `load_writing_context`, `review_writing_content`
- `toolPrefix: "code"` → `load_code_context`, `review_code_content`

**Rules:**
- Lowercase letters, numbers, and underscores only
- Must start with a letter
- Keep it short (4-10 characters)

## principles (Required)

High-level guidelines that apply broadly across your domain.

```yaml
principles:
  - name: "Clarity"                           # Required
    description: "Easy to understand"         # Optional
    guidelines:                               # Required (min 1)
      - "Use simple words"
      - "One idea per sentence"
    examples:                                 # Optional
      - bad: "Utilize the methodology..."
        good: "Use the method..."
        explanation: "Simpler is clearer"     # Optional
```

**Tips:**
- 3-5 principles is usually sufficient
- Each principle should be distinct
- Examples help AI understand your standards

## checkpoints (Required)

Things to verify in content. These are the core of your expertise.

```yaml
checkpoints:
  - id: "introduction"                        # Required: Unique ID
    name: "Introduction"                      # Required: Display name
    purpose: "Set context for the reader"     # Required: Why it matters
    whatIndicatesPresence:                    # Required (min 1)
      - "Clear statement of topic"
      - "Explanation of why it matters"
    commonProblems:                           # Required (can be empty)
      - "Too long before the main point"
      - "Missing the 'so what'"
    clarifyingQuestions:                      # Optional
      - "What is the one-sentence summary?"
    exampleGood: "This guide shows..."        # Optional
    examplePoor: "Writing has been..."        # Optional
```

### Semantic Indicators

**Critical:** Use semantic descriptions, not keywords.

```yaml
# BAD - keyword matching
whatIndicatesPresence:
  - "introduction"
  - "overview"

# GOOD - semantic understanding
whatIndicatesPresence:
  - "Clear statement of what the content is about"
  - "Explanation of why this matters to the reader"
```

AI understands meaning. Describe **concepts** you're looking for.

## categories (Optional)

Types of content within your domain. Useful when different content types have different considerations.

```yaml
categories:
  - id: "technical"                           # Required: Unique ID
    name: "Technical Writing"                 # Required: Display name
    description: "Documentation and guides"   # Required
    indicators:                               # Required
      - "Contains step-by-step instructions"
      - "Explains how something works"
    considerations:                           # Required
      - "Balance detail with readability"
      - "Include prerequisites"
    commonPatterns:                           # Optional
      - "Overview → Steps → Verification"
```

**Examples by domain:**
- Writing: technical, persuasive, informative, narrative
- Code Review: feature, bugfix, refactor, security
- Recipes: appetizer, main course, dessert, baking

## qualityChecks (Optional)

Specific things to check with examples showing bad vs. good.

```yaml
qualityChecks:
  jargon:                                     # Key = check name
    whatToCheck: "Terms that confuse readers" # Required
    whyItMatters: "Jargon excludes people"    # Required
    examples:                                 # Required
      - bad: "Leverage the API endpoints"
        good: "Use the API endpoints"
        explanation: "Plain language is clearer"  # Optional

  passiveVoice:
    whatToCheck: "Sentences where actor is unclear"
    whyItMatters: "Passive voice hides responsibility"
    examples:
      - bad: "The report was submitted late"
        good: "The team submitted the report late"
```

**Common quality check categories:**
- Writing: jargon, passiveVoice, vagueTerms, sentenceLength
- Code: complexity, naming, errorHandling, security
- Recipes: technique, timing, temperature, seasoning

## reviewGuidance (Required)

How to provide constructive feedback on content.

```yaml
reviewGuidance:
  purpose: "Help improve without discouraging" # Optional
  feedbackStructure:                          # Required (min 1)
    - "Start with what works well"
    - "Focus on 2-3 high-impact improvements"
    - "Offer suggestions, not just criticisms"
  reviewerMindset:                            # Optional
    - "You're helping improve, not judging"
    - "Assume the writer did their best"
  tone:                                       # Required (min 1)
    - "Use 'consider' instead of 'you should'"
    - "Frame issues as opportunities"
```

This guidance shapes how AI delivers feedback to users.

## requirements (Optional)

External constraints or compliance requirements. Only include if your domain has external rules.

```yaml
requirements:
  - name: "GDPR"                              # Required
    triggers:                                 # Required
      - "Content involves EU personal data"
      - "Data processing is described"
    description: "EU data protection rules"   # Required
    caveats:                                  # Optional
      - "Always consult legal counsel"
      - "Requirements vary by country"
```

**Examples:**
- Legal writing: jurisdiction requirements
- Security reports: compliance frameworks (SOC 2, HIPAA)
- Technical docs: API versioning requirements

## Attribution (Optional)

Use these fields when part of your expertise file paraphrases or references a framework originally authored by someone else. Every field is optional and backward-compatible. Files that don't use attribution continue to validate unchanged.

### Why attribution exists

Most expertise files are single-author. Sometimes, though, the most useful thing you can offer a user is a framework created by someone else, explained in your own words. The attribution fields let you do that without misrepresenting authorship: you keep your name on your content, and credit the original author for theirs.

### `meta.attributionPolicy`

Top-level string that describes how your file handles external authorship. Set this when at least one section uses the section-level attribution fields.

```yaml
meta:
  author: "Your Name"
  license: "CC BY 4.0"
  attributionPolicy: "External frameworks, when included, are attributed to their original authors via per-section originalAuthor, sourceUrl, attributionType, and license fields."
```

### Section-level fields

These four optional fields can appear on any `principle`, `checkpoint`, `category`, `requirement`, or `qualityChecks` entry:

| Field | Type | Purpose |
|-------|------|---------|
| `originalAuthor` | string | Name of the external author |
| `sourceUrl` | string | URL to the original source |
| `attributionType` | enum | How this section relates to the source (see below) |
| `license` | string | Section-scoped license that overrides `meta.license` for this scope |

### `attributionType` values

The enum has five values covering the spectrum from own content through licensed reproduction:

| Value | Meaning |
|-------|---------|
| `self-authored` | Your original content. Default when the field is omitted. |
| `self-derived` | Your content derived from your other writing |
| `external-reference` | Pointer to an external source, with minimal content reproduced here |
| `external-paraphrased` | Paraphrase of an external framework with attribution (standard fair-use pattern) |
| `external-licensed` | Reproduction of external content under an explicit license |

### Per-item attribution on guidelines

`guidelines` entries under a principle can be either a plain string or an object with its own attribution. Use this when most of a principle is yours but a single guideline comes from somewhere else.

```yaml
principles:
  - name: "Clarity"
    guidelines:
      - "Write one idea per sentence."
      - text: "Active voice keeps the actor visible."
        attribution: "Generic Author, Example Style Guide"
```

### Complete example

A checkpoint that paraphrases an external style guide, attributed at the section level:

```yaml
checkpoints:
  - id: "consistent_terminology"
    name: "Consistent Terminology"
    purpose: "Same concept uses the same name throughout the document."
    whatIndicatesPresence:
      - "A single term chosen for each concept and used everywhere"
      - "Synonyms removed or explicitly noted as equivalent"
    commonProblems:
      - "Mixing 'user', 'customer', and 'client' for the same role"
    originalAuthor: "Generic Author"
    sourceUrl: "https://example.com/acme-style-guide"
    attributionType: "external-paraphrased"
    license: "Framework by Generic Author; summary by Your Name"
```

### Validator behavior

- Invalid `attributionType` values (anything outside the five allowed strings) fail validation with a clear error path.
- Sections that declare `attributionType: "external-*"` but leave both `originalAuthor` and `sourceUrl` empty trigger a warning, since an external attribution with no source is not useful to a reader.
- The validation summary includes a count of externally-attributed items.

## Complete Example

See `content/expertise.yaml` for a complete working example.

## Validation

Run the validation script to check your YAML:

```bash
bun run validate
# Or specify a file:
bun scripts/validate-expertise.ts path/to/your.yaml
```

The validator will:
- Check required fields
- Validate types and formats
- Suggest improvements
- Show the tools that will be created

## Tips for Good Expertise Files

1. **Be specific**: Vague guidelines produce vague feedback
2. **Include examples**: They help AI understand your standards
3. **Use semantic language**: Describe concepts, not keywords
4. **Keep it focused**: 5-10 checkpoints is usually enough
5. **Test with real content**: Make sure the guidance produces useful feedback
6. **Iterate**: Start simple, add detail based on what's missing
