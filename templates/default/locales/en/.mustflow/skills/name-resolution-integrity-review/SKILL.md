---
mustflow_doc: skill.name-resolution-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: name-resolution-integrity-review
description: Apply this skill when the same name, hostname, variable, function, type, module, package, class, repository label, dependency coordinate, or import resolves differently by process, execution space, resolver API, scope, namespace, lookup phase, search path, route, condition, variant, loader, proxy, cache, or platform; including NSS status actions, split DNS, recursive versus authoritative DNS, delegation or glue, DoH, search suffixes, proxy-side DNS, negative caching, address selection, connection reuse, language shadowing or delayed lookup, macro hygiene, conditional exports, duplicate module instances, class-loader identity, peer contexts, package-manager resolution, build-system variants, and stale resolver caches.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.name-resolution-integrity-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Name Resolution Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Diagnose name-resolution defects as disagreements about the resolver, context, candidate graph,
precedence, cache, and resulting identity rather than as spelling mistakes.

For every disputed name, trace:

`requester -> execution space -> input form -> candidate expansion -> search or routing graph ->
filters and precedence -> cache layer -> selected result -> loaded or contacted identity`

Keep successful lookup, selected identity, reachability, compatibility, authorization, and usable
behavior as separate claims. A name can resolve successfully to the wrong object, or resolve to the
right object and fail at the next boundary.

<!-- mustflow-section: use-when -->
## Use When

- A hostname works in one application, shell, container, VPN, proxy mode, browser, network namespace,
  or resolver but fails or selects another address in a different one.
- Resolver APIs, NSS status actions, split DNS, route-only domains, search suffixes, absolute names,
  mDNS or LLMNR, hosts files, recursive or authoritative DNS, delegation, glue, DoH, DNSSEC, DNS64,
  CDN selection, negative caching, address racing, connection pools, stale answers, or proxy-side
  resolution is involved.
- A variable, function, type, macro, label, extension method, overload, import, or module changes
  meaning because of scope, namespace, shadowing, hygiene, lookup phase, or candidate precedence.
- A module or package name maps to a different physical file, export condition, peer context,
  feature set, variant, class loader, workspace replacement, repository mapping, or cache entry.
- A lockfile, dependency coordinate, source spelling, or direct DNS query appears correct but does
  not prove the identity used by the failing process.
- A resolver, loader, package manager, build system, compiler, interpreter, proxy, browser, or runtime
  needs evidence that explains both the selected result and rejected candidates.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The incident boundary is still unknown and name resolution is only one of many hypotheses; use
  `incident-triage-review` first and this skill after resolver evidence appears.
- The task changes parser grammar, tokens, CST, or syntax recovery without binding or lookup changes;
  use `parser-engineering-review`.
- The task changes compiler or interpreter semantics beyond binding, lookup, scope, module identity,
  or resolver caching; use `compiler-engineering-review` or `interpreter-engineering-review` as owner.
- The task adds, upgrades, removes, audits, or approves a dependency rather than diagnosing how an
  existing coordinate resolves; use `dependency-reality-check` or `dependency-upgrade-review`.
- The task changes architecture import direction or public package boundaries without a disputed
  resolver result; use `module-boundary-review`.
- The task concerns linker symbol selection, mangling, relocation, or loader-visible binary symbols;
  use `compiler-engineering-review`.
- The task concerns path containment, symlink traversal, file identity, SSRF rebinding, or remote-file
  authorization as the primary security boundary; use the matching filesystem, SSRF, or upload skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Exact original spelling, normalized spelling, absolute or qualified form, namespace or record kind,
  and every generated candidate actually considered.
- Requester identity: process, executable, runtime, source location, module, class loader, thread or
  task context, user, container, pod, network namespace, working directory, and environment.
- Resolver identity and mode: application or runtime API, implementation, build mode, platform,
  configuration source, name-service modules and status actions, lookup phase, active conditions,
  search roots, routing domains, server-selection state, precedence, fallback, and policy overlays.
- Resolution trace: candidate order, candidate origin, acceptance tests, rejection reasons, selected
  result, stop condition, fallback, and error taxonomy.
- Identity evidence after resolution: canonical path or realpath, package and version, export target,
  peer or feature context, loader identity, module cache key, address family, DNS answer source,
  selected and actually contacted endpoint, connection generation or reuse state, or other
  domain-specific object identity.
- Cache ledger: layer owner, key, positive or negative value, freshness or TTL, invalidation event,
  stale-serving policy, process lifetime, and whether the failing request hit or bypassed it.
- Comparison evidence from the failing execution space and a controlled working space, captured before
  configuration changes, cache flushes, restarts, reinstalls, or clean builds erase the difference.
- Expected resolution contract, supported platform or language semantics, compatibility window,
  deterministic oracle, and exact failure class.
- Configured command intents for the selected repository.

Read [DNS and Network Resolution Checklist](references/dns-network-resolution-checklist.md) when
hostnames, split DNS, VPNs, proxies, containers, DNSSEC, transport, CDN answers, or resolver caches are
in scope.

Read [Language and Symbol Resolution Checklist](references/language-symbol-resolution-checklist.md)
when lexical binding, shadowing, overload lookup, namespaces, macros, extension methods, generated
code, or language lookup phases are in scope.

Read [Module, Package, and Loader Resolution Checklist](references/module-package-loader-resolution-checklist.md)
when imports, package exports, module instances, class loaders, package-manager graphs, build variants,
workspace mappings, feature unification, or build-system search caches are in scope.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- The failing requester and execution space are identified, or the result is explicitly limited to a
  hypothesis about another environment.
- Repository instructions and configured command intents have been checked.
- External command recipes are treated as manual evidence ideas, not command authority.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add bounded resolver tracing, structured resolution diagnostics, provenance fields, cache-key
  visibility, candidate and rejection evidence, and directly related tests or runbook guidance.
- Fix lookup configuration, explicit qualification, import aliases, resolver conditions, loader
  ownership, cache invalidation, package declarations, or generated-code names when current evidence
  proves that surface owns the mismatch.
- Add positive and negative fixtures that vary one resolver dimension at a time.
- Do not flush caches, reinstall dependencies, delete build directories, restart services, disable
  validation, rewrite network policy, or change global resolver settings before preserving evidence.
- Do not add raw diagnostic commands to the skill or claim this procedure authorizes live systems,
  production packet capture, tracing, namespace entry, dependency installation, or cache deletion.

<!-- mustflow-section: procedure -->
## Procedure

1. State the resolution claim precisely. Name the requester, original input, expected object, actual
   object or error, execution space, and observation time. Separate not found, ambiguous, forbidden,
   invalid, stale, incompatible, unreachable, and wrong-identity outcomes.
2. Reproduce from the failing boundary before changing it. Preserve resolver configuration, search
   roots, environment, route state, active conditions, loader identity, caches visible without
   mutation, and actual selected object. A host-shell success is not container or application proof.
3. Build a resolution ledger. For each stage, record input, actor, namespace, phase, candidate set,
   ordering rule, filter, cache, output, and stop reason. Do not jump from source spelling directly to
   final behavior.
4. Distinguish four identities:
   - textual identity: the spelling or coordinate supplied;
   - resolved identity: the selected path, symbol, address, variant, or definition;
   - loaded identity: the module instance, class loader, process object, or runtime endpoint used;
   - behavioral identity: the API, state, route, or service behavior actually observed.
5. Enumerate candidates before choosing a fix. Include expanded search-suffix names, lexical scopes,
   associated namespaces, import roots, conditional exports, peer contexts, variants, repositories,
   aliases, mappings, and fallbacks. Record rejected candidates and reasons, not only the winner.
6. Make precedence executable or observable. Test one controlled perturbation at a time: qualification,
   search-root order, route specificity, import mode, loader, active condition, feature, variant,
   working directory, or cache bypass. Preserve all other dimensions.
7. Treat cache as part of semantics. Locate positive, negative, failure, compiled-code, module,
   package, build, resolver, proxy, and browser caches. Capture key, owner, value, age, and provenance
   before considering invalidation. A restart that fixes the symptom without naming the stale layer
   has not localized the defect.
8. Compare like with like. The control and failing probes must use the same requester class, execution
   space, name form, query or namespace kind, resolver path, active options, credentials, and time
   window unless one of those is the isolated variable.
9. Prove the selected result independently. For files and modules, record canonical origin and loader
   or cache identity. For language symbols, record declaration and lookup phase. For DNS, record the
   actual resolver API, QNAME, record kind, response source, recursive and authoritative boundary,
   flags, TTL, route, candidate address set, and address selected by the client.
10. Continue one boundary beyond resolution. Verify the endpoint actually contacted, whether a prior
    connection or pool entry bypassed fresh lookup, route, TLS or protocol authority identity,
    authorization, initialization state, and type or API compatibility as applicable. Do not relabel
    a post-resolution or connection-reuse failure as lookup failure.
11. Add structured observability at the narrowest stable boundary. Prefer low-cardinality reason codes,
    resolver mode, selected origin, candidate count, cache status, and stable identity fingerprints.
    Redact private names, paths, addresses, search domains, and user-controlled text.
12. Convert the defect into a differential fixture. Vary the proven trigger while keeping the expected
    selected identity and rejection reasons explicit. Include the wrong-but-successful resolution case,
    not only lookup failure.
13. Hand off ownership after localization:
    - DNS or network resolver implementation and runbooks to the relevant operations or incident skill;
    - language binding semantics to compiler or interpreter engineering;
    - package declarations and supported dependency contracts to `dependency-reality-check`;
    - architecture import direction to `module-boundary-review`;
    - cache behavior to `cache-integrity-review`;
    - security-sensitive rebinding or traversal to the matching security skill.

<!-- mustflow-section: postconditions -->
## Postconditions

- The failing requester, execution space, resolver API and path, input form, namespace, phase,
  candidate order, cache layer, selected result, actual connection identity, and final loaded or
  contacted identity are explicit.
- Success, wrong identity, ambiguity, policy rejection, stale result, incompatibility, reachability,
  and downstream behavior remain distinct outcomes.
- The first divergent resolver stage is identified or the missing trace boundary is reported.
- Evidence was preserved before destructive cache, dependency, build, or network resets.
- Any fix is tied to the stage that owns the wrong candidate, precedence, identity, or stale cache.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer narrow configured resolver, module, package, compiler, interpreter, container, DNS, network,
cache, or runbook checks. Do not infer raw lookup, tracing, packet-capture, namespace, package-manager,
build-system, browser, or cache-flush commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If only a direct resolver probe succeeds, report that boundary; do not claim the application path.
- If the failing process cannot be inspected, preserve the environmental delta and mark resolver,
  cache, and loaded identity as unverified.
- If a cache flush or restart already erased the state, reproduce under a controlled fixture or report
  the missing pre-reset evidence instead of declaring the cache guilty.
- If multiple dimensions differ, reduce them one at a time; do not select a cause from a bundle of
  changed environment, resolver, path, loader, and cache state.
- If the name resolves correctly but the object is unreachable, incompatible, unauthorized, or
  misconfigured, hand off at that next boundary and retain the successful resolution evidence.
- If required live diagnostics are manual-only or unconfigured, stop at a repository-owned evidence
  plan and report the missing execution proof.

<!-- mustflow-section: output-format -->
## Output Format

- Resolution claim and exact failure class
- Requester and execution-space capsule
- Original, normalized, expanded, qualified, and selected names
- Resolver API, stages, namespaces, phases, candidate order, filters, and rejection reasons
- Cache layers, keys, freshness, negative or stale state, and invalidation evidence
- Resolved, selected-address, connection-reuse, loaded, and behavioral identity evidence
- First divergent stage and owning skill or subsystem
- Files changed
- Configured command intents run
- Skipped or manual-only resolver checks
- Remaining identity, cache, environment, or downstream-boundary risk
