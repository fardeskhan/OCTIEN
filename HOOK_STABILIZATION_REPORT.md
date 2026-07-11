# COSMY ERP — Hook Stabilization Report (RC5.0A)

**Date:** 2026-07-08
**Issue:** Every `Bash`, `Write`, and `Edit` tool call emitted a hook error, blocking Bash entirely and
spamming write operations with false failures.

## Root cause
The `agentforce-adlc` plugin registers two hooks whose commands pass an **unquoted** plugin path to
`python3`. On this machine `${CLAUDE_PLUGIN_ROOT}` expands to:

```
C:\Users\TUF GAMING\.claude\plugins\cache\claude-plugins-official\agentforce-adlc\0.7.0
```

The space in **`TUF GAMING`** caused the shell to split the argument, so `python3` received
`C:\Users\TUF` as the script to run:

```
python.exe: can't open file 'C:\Users\TUF': [Errno 2] No such file or directory
```

The Python scripts themselves were present and correct — only the command quoting was wrong.

## Fix
File: `~/.claude/plugins/cache/claude-plugins-official/agentforce-adlc/0.7.0/hooks/hooks.json`

Quoted the script path in both hook commands:

| Hook | Before | After |
|---|---|---|
| PreToolUse (Bash) | `python3 ${CLAUDE_PLUGIN_ROOT}/shared/hooks/scripts/guardrails.py` | `python3 "${CLAUDE_PLUGIN_ROOT}/shared/hooks/scripts/guardrails.py"` |
| PostToolUse (Write\|Edit) | `python3 ${CLAUDE_PLUGIN_ROOT}/shared/hooks/scripts/agent-validator.py` | `python3 "${CLAUDE_PLUGIN_ROOT}/shared/hooks/scripts/agent-validator.py"` |

## Verification
Ran both scripts exactly as the hooks now invoke them (quoted path, JSON on stdin):

```
guardrails.py      → {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}  exit 0
agent-validator.py → (allow)                                                                              exit 0
```

- ✅ Hook executes successfully
- ✅ No false failures
- ✅ No writes blocked
- ✅ Works with the Windows path containing a space

## Caveats / notes
- **Restart required:** Claude Code loads hook configuration at session start, so the currently running
  session keeps using the old (unquoted) command. The fix takes effect on the next session.
- **Plugin cache:** the edit is in the plugin's **cached** copy under `~/.claude/plugins/cache/...`.
  Reinstalling or updating the `agentforce-adlc` plugin may overwrite it. If it recurs, re-apply the same
  quoting, or (cleaner long-term) report the missing quotes upstream to the plugin author, or disable the
  plugin if its Agentforce hooks are not needed for this project.
- The same class of bug would affect any plugin hook using an unquoted `${CLAUDE_PLUGIN_ROOT}` on a
  Windows profile path containing spaces.
