# Example Session: README Review Server in Action

This demo shows how [`readme-review.yaml`](readme-review.yaml) works in practice. A developer asks their AI assistant to review their project's README, and the AI uses the MCP server to get expert criteria for both human readers and AI coding assistants.

## The User's Request

A developer has written a README for their new CLI tool and wants feedback:

```
Can you review my README? I want it to be useful for both humans
and AI coding assistants like Claude Code.

# jsonfix

A JSON formatting and validation tool.

## Installation

First make sure you have Node.js installed (version 18 or higher is
recommended). Then you can install globally:

npm i -g jsonfix

## Usage

jsonfix can validate and format JSON files. Run it on a file to see
the output. There are various options available - see jsonfix --help
for more information.

## Development

Clone the repo and run npm install. Use npm test to run the tests.
See the code for architecture details.

## License

MIT
```

## Behind the Scenes

The AI recognizes this as a README review task and calls the MCP server:

**Tool call:** `review_readme_content`
```json
{
  "checkpoints": ["opening", "installation", "quickstart", "project_structure", "ai_context"],
  "focus": ["missingContext", "fragileInstructions"]
}
```

**Server returns:** Review criteria including checkpoints to verify (opening section, installation, quick start, project structure, AI context), quality checks (missing context, fragile instructions), and guidance on how to frame feedback constructively.

## The AI's Feedback

Using the expertise from the server, the assistant responds:

---

**README Review: jsonfix**

**What works well:**
- Clear, short project name
- License included
- Has the essential sections (install, usage)

**High-impact improvements:**

**1. Lead with what it does, not what it is**

Your first line tells me it's "a JSON formatting and validation tool" but not why I'd want it.

*Current:* "A JSON formatting and validation tool."

*Consider:* "Fix malformed JSON and format it consistently: `jsonfix input.json`"

Show the command and what happens—this helps both humans scanning quickly and AI assistants understanding the interface.

**2. Make installation copy-paste ready**

The prerequisites and install are in prose, requiring readers to extract the commands.

*Current:* "First make sure you have Node.js installed (version 18 or higher is recommended). Then you can install globally:"

*Consider:* Separate comment lines from commands, add a verification step:
```
# Requires Node.js 18+
npm install -g jsonfix

# Verify installation
jsonfix --version
```

**3. Show the happy path with output**

"Run it on a file to see the output" doesn't show what success looks like.

*Consider:* Show the command AND what it outputs:
```
$ jsonfix malformed.json
✓ Fixed 3 issues:
  - Added missing comma (line 4)
  - Removed trailing comma (line 12)
  - Quoted unquoted key (line 7)
```

**4. Add project structure for AI assistants**

"See the code for architecture details" doesn't help AI coding assistants (or new contributors) navigate your codebase.

*Consider:* Add a file tree with brief descriptions:
```
src/
  cli.ts        # Command-line interface
  parser.ts     # JSON parsing and error recovery
  formatter.ts  # Output formatting
```

**5. Document development workflow**

AI assistants need to know how to run tests and build. Prose like "Use npm test to run the tests" requires parsing.

*Consider:* Explicit commands with comments:
```
npm test        # Run tests
npm run build   # Compile TypeScript
npm run lint    # Check code style
```

---

## How Generic AI Would Miss This

Generic AI gives generic advice. Here's what specialized README expertise adds:

| What the README Has | Generic AI Response | Expert Response |
|---------------------|--------------------|-----------------------------|
| "A JSON formatting and validation tool" | "Clear description" | "Leads with what it *is*, not what it *does*—show the command" |
| "First make sure you have Node.js installed..." | "Good prerequisites" | "Prose requires parsing—use copy-paste code blocks" |
| "Run it on a file to see the output" | "Explains usage" | "Doesn't show what success looks like—include example output" |
| "See the code for architecture details" | "Points to source" | "Useless for AI assistants—add explicit project structure" |
| "Use npm test to run the tests" | "Documents testing" | "AI can't parse prose—use explicit command blocks" |

## The Human + AI Assistant Angle

This expertise is specifically designed for READMEs that serve **two audiences**:

| For Humans | For AI Assistants |
|------------|-------------------|
| "Fix malformed JSON" tells them what it does | Command example shows the interface to call |
| Installation steps are scannable | Copy-paste blocks can be executed directly |
| Project structure helps navigation | AI can locate the right file for a task |
| Development commands are listed | AI knows how to run tests after making changes |

Generic README advice focuses only on humans. This expertise recognizes that AI coding assistants are now a primary audience.

## How Guidelines Shaped the Feedback

| Guideline from YAML | How It Appeared in Feedback |
|---------------------|----------------------------|
| "First sentence states what the project does, not what it is" | Suggested leading with the command and value |
| "Commands should work when pasted directly" | Rewrote installation as copy-paste blocks |
| "Show the expected output so readers know it worked" | Added example output showing success |
| "Document the project structure with a file tree" | Suggested Project Structure section |
| "List common development tasks: how to run tests, build, lint" | Expanded Development with explicit commands |
