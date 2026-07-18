# Tree Traversal and Rewrite Checklist

Use this checklist when syntax or semantic trees are visited, transformed, rewritten, structurally
shared, incrementally remapped, or used as keys for cached analysis.

## Contents

1. [Responsibility split](#responsibility-split)
2. [Traversal policy](#traversal-policy)
3. [Immutable snapshot boundary](#immutable-snapshot-boundary)
4. [Traversal context](#traversal-context)
5. [Transformation result algebra](#transformation-result-algebra)
6. [Edit collection and conflict resolution](#edit-collection-and-conflict-resolution)
7. [Structural sharing and source fidelity](#structural-sharing-and-source-fidelity)
8. [Handles and identity across snapshots](#handles-and-identity-across-snapshots)
9. [Analysis invalidation](#analysis-invalidation)
10. [Rewrite termination](#rewrite-termination)
11. [Tree and graph traversal](#tree-and-graph-traversal)
12. [Transactional commit and verification](#transactional-commit-and-verification)
13. [Test matrix](#test-matrix)
14. [Invariants and handoffs](#invariants-and-handoffs)

## Responsibility split

Keep three contracts distinct even when a library uses different names:

| Role | Reads | Produces | Must not do |
| --- | --- | --- | --- |
| Visitor | One immutable snapshot | Observations or side-table facts | Mutate the traversed structure |
| Transformer | One immutable snapshot | A new snapshot or typed change result | Edit nodes in place or resolve rule conflicts implicitly |
| Rewriter | Snapshot, rules, edit policy | Validated transactional commit | Apply a match immediately without conflict and termination policy |

A visitor is not a weak rewriter, and a rewriter is not a visitor with writable nodes. Name the role
in APIs, ownership types, tests, and diagnostics.

## Traversal policy

Declare the policy as data or typed configuration:

- preorder, postorder, enter and leave callbacks, or an explicitly mixed schedule;
- structural nodes, tokens, trivia, missing and error nodes, and synthetic nodes included or skipped;
- source-written versus expanded or generated forms;
- child field order and list order;
- one visit per ownership edge or one visit per unique shared node;
- cancellation, early stop, depth budget, and error propagation;
- behavior for a node kind unknown to the visitor implementation.

Fail closed in development and contract tests when a closed node union gains an unhandled variant.
Do not let a default branch silently omit new syntax from security, refactoring, or semantic passes.

## Immutable snapshot boundary

- Give a visitor read-only access to a versioned snapshot and write observations to a separate result
  builder or generation-aware side table.
- Make a transformer return a new root while reusing unchanged immutable subtrees. Do not mutate the
  child list currently being traversed.
- Collect rewrite proposals against one base snapshot. Do not let an early proposal change what later
  matchers see unless the rewrite contract explicitly starts another bounded epoch.
- Invalidate iterators, wrappers, positions, and parent views when their owning snapshot changes.
- If in-place mutation is unavoidable, require a generation-checked cursor and make every existing
  iterator unusable after mutation. Do not expose this as the ordinary tree API.

## Traversal context

Pass context explicitly rather than hiding it in mutable visitor fields. Include applicable facts:

- document and snapshot generation;
- parent kind, named child field, list index, and ownership path;
- scope owner, language mode, expected node category, and source region;
- cancellation and work budget;
- traversal policy and rewrite epoch.

Use immutable context frames or scoped push and pop guards whose cleanup is guaranteed on early
return and error. Never infer a semantic parent from an obsolete parent pointer.

## Transformation result algebra

Do not overload null with several outcomes. Use typed results such as:

- `Keep` for unchanged identity and structure;
- `Replace(node)` for one category-compatible replacement;
- `Delete` only where the parent field is optional or repeated;
- `Splice(nodes)` only in a repeated slot with compatible element kinds;
- `Stop(result)` for successful bounded early termination;
- `Error(diagnostic)` for a failed transformation with no commit.

Validate result kind and cardinality at the parent boundary. Reject deletion of a required child,
splicing into a scalar field, or replacing an expression with a declaration before a malformed
intermediate tree becomes observable.

## Edit collection and conflict resolution

Represent every proposal with rule identity, base snapshot, target handle, expected kind, parent
field, source or structural anchor, replacement, priority, and provenance. Then:

1. collect candidates without mutation;
2. reject stale or unresolved targets;
3. group overlapping parent, child, sibling, and source-range edits;
4. resolve conflicts under one documented policy;
5. sort accepted edits deterministically;
6. apply them to a private new snapshot;
7. verify and publish atomically.

Define whether outer replacement suppresses inner edits, deeper edits win, or a conflict is an error.
Rule registration order must not become accidental precedence. A failed commit exposes neither a
partial tree nor partially updated side tables.

## Structural sharing and source fidelity

- Keep reusable persistent nodes free of parent pointers and absolute positions. Derive snapshot-
  specific parents and positions through ephemeral wrappers or indexed views.
- Preserve syntax origins, token ownership, trivia, missing tokens, and delimiter relationships when
  replacing source-aware nodes.
- Reuse an original node only when all structural children, payload, recovery state, and relevant
  source references are unchanged.
- Distinguish generated text from original slices. Do not copy a parent's full span onto a synthetic
  child or claim user authorship for inserted syntax.
- Reconcile leading, trailing, and dangling trivia at edit boundaries under a deterministic policy.

## Handles and identity across snapshots

Separate allocation identity, snapshot-local node identity, persistent syntax identity, and semantic
definition identity. A byte offset or structural hash is not any of those identities.

A durable handle should carry document identity, expected snapshot or generation, node key, expected
kind, and optional owner or field anchor. Resolve it through the current snapshot into a state such as
`Alive`, `Replaced`, `Deleted`, `Ambiguous`, `WrongDocument`, or `OutOfDate`; do not return one null for
every failure class.

Inherit persistent identity only from actual subtree reuse or one unambiguous bounded reconciliation.
Match within an owner using kind, field role, stable token anchors, sibling alignment, and structure.
When candidates tie, allocate a new identity. Copy and move identity require edit-lineage evidence;
final text alone cannot prove user intent.

Mark recovery regions and their ancestor chain unstable. Avoid aggressively transferring identity
through rapidly changing missing and error nodes.

## Analysis invalidation

Each transformation declares:

- node fields, ownership regions, symbols, control flow, and source relations it reads;
- structure, names, effects, types, scopes, or origins it may change;
- analyses proven preserved and the proof boundary;
- analyses invalidated, recomputed, or weakened;
- deleted-node keys and snapshot generations retired at commit.

Default unproven analyses to invalid. Syntax identity survival does not prove symbol, type, control-
flow, macro, language-option, or cross-file dependency facts remain valid.

## Rewrite termination

Bound every repeated rewrite by at least one explicit mechanism:

- a well-founded cost that strictly decreases;
- stage direction that forbids returning to an earlier form;
- rule and node application history within an epoch;
- repeated structural-state detection;
- maximum epochs, proposals, committed edits, and work units.

Reject self-recreating and mutually inverse rule cycles. For canonicalization, require idempotence:
running the completed rewrite again produces no structural or semantic change. If a pass intentionally
is not idempotent, name its finite convergence contract.

## Tree and graph traversal

Walk ownership children as a tree or forest. Treat symbol links, use-def relations, control-flow
edges, parent maps, and cross-file references as separate graphs with their own visited set, cycle
policy, ordering, and budget. Do not recursively follow all references with the ownership visitor.

For graphs, state whether work is per node, edge, path, strongly connected component, block, or
program point. Shared targets and cycles are ordinary graph structure, not tree exceptions.

## Transactional commit and verification

Before commit, verify proposal freshness and replacement category. After private construction, run
the phase verifier for node kinds, required children, cycles, parent ownership, identities, spans,
origins, recovery states, and side-table generation. Publish the new root and compatible analysis
generation together or publish neither.

Keep diagnostics tied to rule identity and the smallest input/output boundary. A later crash must not
be the first evidence that an earlier rewrite broke the tree.

## Test matrix

- Assert preorder, postorder, enter/leave, token/trivia, generated-node, error-node, and stop behavior.
- Add a new node variant and prove exhaustive visitors or contract tests reject missing handling.
- Exercise every typed transformation outcome in scalar, optional, and repeated fields.
- Generate overlapping parent/child and sibling edits; permute rule registration and candidate order.
- Compare old-snapshot traversal with new-snapshot output and prove no inserted node is accidentally
  revisited in the same epoch.
- Verify unchanged subtrees are shared and changed wrappers, positions, and handles become stale.
- Test ambiguous reconciliation, copy, move, deletion, recovery zones, generation reuse, and ABA-like
  slot reuse.
- Compare preserved analyses with independent full recomputation.
- Run rewrite idempotence, cycle, work-budget, cancellation, rollback, and verifier-failure cases.
- Apply randomized edit sequences and compare incremental trees and handles with fresh reconstruction.

## Invariants and handoffs

- Every traversal has a declared order, edge model, inclusion policy, and budget.
- Every visitor is read-only and every transformation creates a new validated snapshot.
- Every edit conflict and rewrite cycle reaches a deterministic bounded outcome.
- Every durable handle is resolved against document and generation context.
- Every preserved analysis is explicitly justified; all others are invalidated.
- Use `parser-engineering-review` for syntax-tree traversal, source-aware transforms, and snapshots.
- Use `compiler-engineering-review` for IR pass preservation, CFG, SSA, and semantic refinement.
- Use `name-resolution-integrity-review` for symbol identity and binding-side-table disagreements.
- Use `fuzz-harness-review` when traversal or rewrite fuzzing becomes a maintained campaign.
