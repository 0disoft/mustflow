# Instruction Authority v1

This specification defines how mustflow determines effective workflow rules when multiple instruction sources are present.

## Scope

This document applies to repository-local mustflow behavior. It does not cover global model safety, host approval policies, or user task goals.

## Authority Lanes

Rules are resolved by lane. A lower lane cannot override a higher or stricter lane.

1. Current user instructions define the task goal unless deemed unsafe.  
2. Host safety, sandbox, approval, and execution gates remain binding.  
3. Repository workflow rules originate from the nearest [AGENTS.md](../../AGENTS.md) and `.mustflow/config/*.toml`.  
4. Command execution rules come from  
   [.mustflow/config/commands.toml](../../.mustflow/config/commands.toml).  
5. Verification evidence is derived from current files and `mf run` receipts.  
6. Context, preferences, generated maps, caches, and summaries are lower-authority inputs.

## Merge Rules

When multiple sources contribute compatible rules:

- Allowed action sets are intersected.  
- Denied actions are unioned.  
- Approval requirements are unioned.  
- Privacy and secret-handling rules are unioned.  
- Time, output, and retention limits adopt the stricter value.  
- Generated state never overrides current source files.  
- Host-specific instruction files may add guidance but do not replace the repository command contract.

## Conflict Handling

An agent or implementation must halt and report a conflict when:

- Two required rules cannot both be satisfied;  
- The nearest mustflow root is ambiguous;  
- A command must be inferred outside `commands.toml`;  
- Generated state conflicts with current source files; or  
- A host policy requires behavior forbidden by the repository contract.

The report should identify the conflicting sources and the action that was not executed.

## Testable Outcomes

- A direct user request can select the task goal but cannot cause an unconfigured project command to count as mustflow verification.  
- `AGENTS.md` can mandate use of `mf run` but cannot weaken host approval or sandbox rules.  
- `.mustflow/context/*` can guide task selection but cannot override `commands.toml`.  
- `.mustflow/state/**` can record evidence but cannot become source truth.