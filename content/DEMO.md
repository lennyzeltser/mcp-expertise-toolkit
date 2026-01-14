# Demo: Writing Feedback MCP Server in Action

This demo shows how the included `expertise.yaml` example works in practice. It illustrates a realistic session where an AI assistant uses the MCP server to help a user improve their writing.

> **Note:** This example uses the "Writing Feedback" domain from the included `expertise.yaml`. When you customize the server with your own expertise, your users will have a similar experience tailored to your domain.

---

## The Scenario

A user asks their AI assistant (Claude, connected via Claude Code or Claude Desktop) to help improve a work email they've drafted.

---

## The Session

### User's Request

```
I need to send an email to my team about a new process change. Can you help me
improve this draft?

---

Subject: Process Update

Hi team,

It should be noted that starting next month, there will be changes to our
expense reporting process. The new system, which was selected after a
comprehensive evaluation of multiple vendors, will require all employees
to submit receipts within 5 business days.

The finance team has determined that this change is necessary due to various
compliance requirements. Training will be provided soon.

Let me know if you have questions.
---
```

### What Happens Behind the Scenes

When the AI assistant receives this request, it recognizes this as a writing improvement task. The assistant calls the MCP server to get relevant expertise:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  AI Assistant calls: review_writing_content                                  │
│                                                                              │
│  Parameters:                                                                 │
│    checkpoints: ["introduction", "main_content", "conclusion"]               │
│    focus: ["passiveVoice", "vagueTerms", "jargon"]                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

The server returns review criteria including:
- **Checkpoints** to verify (introduction, main content, conclusion)
- **Quality checks** to apply (passive voice, vague terms, jargon)
- **Feedback guidance** (tone, structure, mindset)

### The AI's Response

Using the expertise from the server, the assistant provides feedback:

---

**Feedback on Your Email Draft**

**What works well:**
- Clear subject line that signals the topic
- Specific deadline mentioned (5 business days)
- Offers to answer questions

**Opportunities for improvement:**

1. **Lead with the "why" for the reader**

   The introduction buries what matters to the team. Consider starting with what they need to know and do:

   > *Current:* "It should be noted that starting next month, there will be changes..."
   >
   > *Consider:* "Starting March 1, you'll submit expense receipts through a new system. Here's what you need to know."

2. **Replace passive voice with active**

   Several sentences hide who is doing what:

   > *Current:* "Training will be provided soon."
   >
   > *Consider:* "Sarah will send training invites next week." (or whoever is responsible)

3. **Be specific instead of vague**

   > *Current:* "due to various compliance requirements"
   >
   > *Consider:* "to meet SOX audit requirements" (if that's the reason)

   > *Current:* "Training will be provided soon"
   >
   > *Consider:* "Training sessions run January 15-17"

4. **Strengthen the conclusion**

   Add a clear next step. What should they do right now?

   > *Consider adding:* "No action needed until March 1. I'll send calendar invites for training next week."

---

### Suggested Revision

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

---

## What the AI Learned from the Server

The feedback above was shaped by the expertise YAML's guidelines:

| Guideline | How It Appeared in Feedback |
|-----------|----------------------------|
| "Lead with the most important information" | Suggested moving the action item to the first sentence |
| "Use active voice" | Identified "will be provided" as passive |
| "Replace vague terms with specifics" | Called out "soon" and "various requirements" |
| "End with a clear next step" | Suggested explicit action items |
| "Frame issues as opportunities" | Used "Opportunities for improvement" heading |
| "Use 'consider' instead of 'you should'" | All suggestions use "Consider:" framing |

---

## Other Ways Users Might Interact

### "Help me write a project update"

The AI would call `load_writing_context` to get principles and structure guidance for creating new content:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  AI Assistant calls: load_writing_context                                    │
│                                                                              │
│  Parameters:                                                                 │
│    detail_level: "standard"                                                  │
│    topics: ["principles", "completeness"]                                    │
│    include_examples: true                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### "What makes a good introduction?"

The AI would call `get_writing_guidelines` for focused guidance:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  AI Assistant calls: get_writing_guidelines                                  │
│                                                                              │
│  Parameters:                                                                 │
│    topic: "checkpoints"                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### "What can this server help me with?"

The AI would call `get_capabilities` to list available tools:

```json
{
  "domain": "Writing Feedback",
  "tools": [
    {
      "name": "load_writing_context",
      "description": "Load expertise context for creating or improving content"
    },
    {
      "name": "review_writing_content",
      "description": "Get review criteria for critiquing existing content"
    },
    {
      "name": "get_writing_guidelines",
      "description": "Get formatted guidelines for specific topics"
    }
  ]
}
```

---

## Privacy Note

Throughout this session, the user's email content **stayed local**. The AI assistant:
1. Received the user's draft locally
2. Called the MCP server to get review criteria (no user content sent)
3. Applied those criteria to the draft locally
4. Returned feedback to the user

The MCP server never saw the user's email.

---

## Adapting This for Your Domain

When you customize `expertise.yaml` with your own expertise, your users will have a similar experience. For example:

| Your Domain | User Request | Server Provides |
|-------------|--------------|-----------------|
| Code Review | "Review this PR" | Your code quality standards |
| Recipe Development | "Help me improve this recipe" | Your culinary principles |
| Security Writing | "Review this incident report" | Your reporting standards |

The interaction pattern stays the same. Only the expertise changes.
