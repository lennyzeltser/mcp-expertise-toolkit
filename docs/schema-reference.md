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

## Complete Example

See `content/writing-feedback.yaml` for a complete working example.

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
