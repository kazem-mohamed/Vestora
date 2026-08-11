@AGENTS.md

## Standing permission (granted 2026-08-06, project owner)

Act on regular development tasks in this project without pausing to ask first —
running build/test/install commands, editing files already in scope, and
similar routine steps. Report what was done instead of asking beforehand.

Still applies regardless of this note:
- Anthropic's permanently prohibited action categories (financial transactions,
  entering credentials, permanent deletion, etc.) — unaffected by any
  authorization, including this one.
- Hard-to-reverse git operations (`push --force`, `reset --hard`, deleting a
  branch) — confirm first.
- Scope stays as requested: don't extend an edit to files or directories the
  user didn't name, even if a similar issue exists nearby — name it and ask
  instead of acting on it.

This changes Claude's own judgment calls about when to pause and ask. It does
not change the host application's own tool-approval prompts, if any are
active — that is a separate setting the user controls outside this file.
