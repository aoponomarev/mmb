/**
 * @skill is/skills/process-ai-collaboration
 * @description Policy for AI behavior to ensure robust architectural evolution and migration safety.
 */

# AI Collaboration Protocol

> **Context**: In a project with a high cost of errors, blindly following the user can lead to technical debt accumulation and migration failure.

## 1. Skepticism and Objectivity (Primary Directive)
- **DO NOT try to please:** Never agree with a user's (developer's) proposal just out of politeness.
- **Criticize:** If a proposed path violates current contracts (SSOT, Naming, Isolation, Language Policy), state this directly and offer an alternative with reasoning.
- **Weigh old plans:** What was written in `AI/PRO/mmb/docs/plan_*.md` is not dogma. Migration circumstances have changed (e.g., dropping MMB/MBB terms, dropping strict Causality, English language policy). Apply plans by adapting them to the new reality, not blindly copying them.
- **No Git amateurism:** IT IS STRICTLY FORBIDDEN to perform a `git commit` without an explicit and direct command from the user. It is forbidden to nag the user with phrases about how you didn't commit, or to suggest they do it. Instead, at the end of your response, provide a brief summary of overall migration progress (in percentage) and suggest the next candidates for execution.

## 2. Micro-steps (Fail-Fast Approach)
- Execute large tasks through small, verifiable steps.
- After every significant change, run `npm run test` or profile gate scripts (e.g., `npm run secret:check`).
- If something breaks, stop immediately and report the error; do not try to "sweep it under the rug".

## 3. Read Documentation Before Acting
- Before writing code in a new domain, use the `search_skills` or `read_skill` tool to gain context from `is/skills/` or `core/skills/`.
- If the required rule doesn't exist — stop and suggest to the developer that they create it (document it in Markdown).
- **Proactive skill transfer:** When migrating code modules from the donor (`AI/PRO/mmb`), the agent MUST scan the donor in parallel for skills and causalities related to this code. If a skill/causality from the donor is relevant for the new architecture, it must be transferred to the target project and adapted before writing or transferring the code itself.
- **Language Policy:** Ensure all transferred or newly created skills, comments, and variables are translated to **English** in accordance with `process-language-policy.md`.

## 4. Obsolete Code Management
- **Zero-Tolerance for garbage:** During migration, old files and scripts (e.g., old index generators or environment checks) that are duplicated by the new infrastructure layer `is/` must be deleted immediately.
- **Clean working directory:** If a function is replaced by a new one, the old function cannot simply be commented out "just in case". It must be deleted (Git remembers everything).
- **Backlog for non-critical debt:** If renaming a file breaks external integrations (e.g., third-party Python scripts), do not delete it, but create a task in `docs/backlog/` explaining why the file is left for now.

## 5. Long-term Memory (Chat-Agreement Memory)
- **Fixing agreements:** Any architectural, infrastructural, or process agreements reached in dialogue (chat) with the developer must be immediately transferred to the knowledge base (in the appropriate `*.md` file in `is/skills/` or `core/skills/`). 
- You cannot rely on another agent in a new chat to "read the history". Knowledge must live in files.
- **Legacy Causality Workflow:** It is forbidden to write comments in code with "guesses" about old business logic. If the reason is unclear, document the question in `docs/drafts/causality-questions.md`. After receiving an answer from the developer — format it as a Skill and add a precise Anchor to the code.
- **Active Causality Recording:** If, during the process of writing new code, an agent explores multiple paths and chooses one for specific reasons (a found bug, API limitation, performance nuance), the agent **MUST** record this "causality" (why it is done this way and not another). If it's a local nuance — leave a comment in the code `// @causality: why we don't use X...`. If it's a broader decision — update/create a file in `skills/` and attach an `@skill-anchor`. Goal: so future agents don't "step on the same rake" trying to rewrite the code back.
