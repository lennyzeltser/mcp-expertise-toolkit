# Example Session: Writing Feedback Server in Action

This demo shows how the included `expertise.yaml` works in practice. A user asks their AI assistant to help improve a work email, and the AI uses the MCP server to get expert guidelines.

When you customize the server with your own expertise, your users will have a similar experience tailored to your domain.

## The User's Request

A user has drafted an email about a process change and asks their AI assistant (Claude via Claude Code or Claude Desktop) for help:

```
I need to send an email to my team about a new process change.
Can you help me improve this draft?

Subject: Process Update

Hi team,

It should be noted that starting next month, there will be changes to our
expense reporting process. The new system, which was selected after a
comprehensive evaluation of multiple vendors, will require all employees
to submit receipts within 5 business days.

The finance team has determined that this change is necessary due to various
compliance requirements. Training will be provided soon.

Let me know if you have questions.
```

## Behind the Scenes

The AI recognizes this as a writing review task and calls the MCP server:

**Tool call:** `review_writing_content`
```json
{
  "checkpoints": ["introduction", "main_content", "conclusion"],
  "focus": ["passiveVoice", "vagueTerms", "jargon"]
}
```

**Server returns:** Review criteria including checkpoints to verify, quality checks to apply, and guidance on how to deliver feedback (tone, structure, mindset).

The AI then analyzes the email locally using these criteria. The user's content is never sent to the server.

## The AI's Feedback

Using the expertise from the server, the assistant responds:

> **Feedback on Your Email Draft**
>
> **What works well:**
> - Clear subject line that signals the topic
> - Specific deadline mentioned (5 business days)
> - Offers to answer questions
>
> **Opportunities for improvement:**
>
> 1. **Lead with the "why" for the reader**
>
>    The introduction buries what matters to the team. Consider starting with what they need to know and do:
>
>    *Current:* "It should be noted that starting next month, there will be changes..."
>
>    *Consider:* "Starting March 1, you'll submit expense receipts through a new system. Here's what you need to know."
>
> 2. **Replace passive voice with active**
>
>    Several sentences hide who is doing what:
>
>    *Current:* "Training will be provided soon."
>
>    *Consider:* "Sarah will send training invites next week."
>
> 3. **Be specific instead of vague**
>
>    *Current:* "due to various compliance requirements"
>    *Consider:* "to meet SOX audit requirements"
>
>    *Current:* "Training will be provided soon"
>    *Consider:* "Training sessions run January 15-17"
>
> 4. **Strengthen the conclusion**
>
>    Add a clear next step. What should they do right now?
>
>    *Consider adding:* "No action needed until March 1. I'll send calendar invites for training next week."

## Suggested Revision

```
Subject: New Expense System Starting March 1

Hi team,

Starting March 1, you'll submit expense receipts through our new system,
Concur. The main change: submit receipts within 5 business days of purchase.

We're making this switch to meet SOX audit requirements and give you faster
reimbursements.

Training sessions run January 15-17. I'll send calendar invites Monday.

No action needed until March 1. Reply here if you have questions.
```

## How Guidelines Shaped the Feedback

The feedback above maps directly to guidelines in `expertise.yaml`:

| Guideline from YAML | How It Appeared in Feedback |
|---------------------|----------------------------|
| "Lead with the most important information" | Suggested moving the action item first |
| "Write in active voice" | Identified "will be provided" as passive |
| "Replace vague terms with specifics" | Called out "soon" and "various requirements" |
| "End with a clear next step" | Suggested explicit action items |
| "Frame issues as opportunities" | Used "Opportunities for improvement" heading |
| "Use 'consider' instead of 'you should'" | All suggestions use "Consider:" framing |

## Other Interaction Patterns

**Creating new content:** "Help me write a project update"

The AI calls `load_writing_context` with parameters like `detail_level: "standard"` and `topics: ["principles", "completeness"]` to get guidance for creating content from scratch.

**Getting specific guidance:** "What makes a good introduction?"

The AI calls `get_writing_guidelines` with `topic: "checkpoints"` to retrieve focused guidance on structural elements.

**Discovering capabilities:** "What can this server help with?"

The AI calls `get_capabilities` to list available tools and their purposes.

## Adapting for Your Domain

When you replace `expertise.yaml` with your own expertise, your users get the same experience:

| Your Domain | User Request | Server Provides |
|-------------|--------------|-----------------|
| Code Review | "Review this PR" | Your code quality standards |
| Recipe Development | "Improve this recipe" | Your culinary principles |
| Security Writing | "Review this incident report" | Your reporting standards |

The interaction pattern stays the same. Only the expertise changes.
