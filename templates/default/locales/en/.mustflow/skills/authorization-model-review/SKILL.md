---
mustflow_doc: skill.authorization-model-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: authorization-model-review
description: Apply this skill when authorization model selection or design needs review for RBAC, ABAC, ReBAC, relationship-based access control, Zanzibar-style relation graphs, role explosion, role hierarchies, mutually exclusive roles, attribute sources of truth, request-time conditions, hybrid authorization models, permission-data ownership, or choosing what actually grants a permission.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.authorization-model-review
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

# Authorization Model Review

<!-- mustflow-section: purpose -->
## Purpose

Review authorization model selection as a decision grounded in what actually grants a permission,
not as a naming exercise.

The review question is not "should we use RBAC or ABAC?" It is "what business fact decides this
permission — a job, a relationship, a request-time condition — and which model stores and updates
that fact most reliably?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports role-based access control, attribute-based access
  control, relationship-based access control, permission matrices, role hierarchies, mutually
  exclusive roles, role explosion, Zanzibar-style relation graphs, user-organization or user-object
  sharing, or attribute sources of truth.
- A product is choosing or re-designing its authorization model for a new tenant, sharing, or
  condition-heavy feature.
- A review needs proof that the chosen model matches how permissions actually change in the product.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task implements or changes specific permission behavior, roles, or policy code; use
  `auth-permission-change` first.
- The task needs object, property, or function-level API authorization proof; use
  `api-access-control-review`.
- The task is tenant isolation mechanics such as context, composite keys, or RLS; use
  `multi-tenant-isolation-review`.
- The task is the admin or operator control plane; use `admin-control-plane-safety-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Business-rule ledger: the natural-language permission rules the product must express.
- Granting-basis ledger: for each rule, whether the basis is a job or role, a relationship or
  membership, or a request-time condition or attribute.
- Data-ownership ledger: who changes the permission data, how often, through which product
  surface, and where the source of truth lives.
- Role inventory: current roles, how many exist, whether names encode attributes or relationships,
  and whether role count grows combinatorially with products, tenants, or regions.
- Attribute ledger: attribute sources, freshness, expiry, and tamper resistance for any ABAC part.
- Existing permission tests, role matrices, security docs, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing business-rule, granting-basis, or data-ownership
  evidence can be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten model-selection decisions, role inventory cleanup, relation-graph or attribute
  source-of-truth choices, hybrid-model boundaries, and directly synchronized documentation or
  templates owned by the selected boundary.
- Update authorization docs, role matrices, migration notes, and tests that describe the same model.
- Do not implement the permission engine or add new command authority under this skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Find what grants permission before choosing a model name.
   - Write the rule in natural language and identify the granting basis. "Accounting staff may
     refund" is a job basis (RBAC). "The document owner or a shared teammate may edit" is an
     object-user connection basis (ReBAC). "Confidential documents open only on company devices
     during business hours" is a request-time condition basis (ABAC).
   - Do not pick a model name first and force the business rules into it.
2. Choose RBAC when permission follows job changes.
   - Internal systems with few stable roles such as support agent, billing operator, and security
     auditor fit RBAC: permissions bind to roles, so hiring, transfer, and exit plus audit stay
     simple, and role hierarchies and mutually exclusive roles express segregation of duties.
   - Stop relying on RBAC alone when every user has different projects, shared objects, or
     organizational scopes.
3. Choose ReBAC when permission follows sharing and membership.
   - Document collaboration, project management, organization-team-folder hierarchies, social
     graphs, and external invites fit relationship-based models. Store relations such as
     `user:123 member organization:7`, `team:4 editor document:9`, and `document:9 parent folder:2`,
     and compute permission along relation paths.
   - Moving an object to another folder or removing a user from a team changes a relation instead of
     inventing a new role. Zanzibar-style systems express diverse sharing models as one relation
     graph with consistent ordering between access-control changes and object changes.
4. Choose ABAC when request-time conditions vary.
   - Device trust, country, business hours, authentication strength, subscription tier, object
     classification, contract state, and risk score change per request and belong in attributes.
     Appending `enterprise`, `korea`, or `trusted_device` to role names inflates the role set.
   - ABAC is only as strong as its attribute pipeline: name who creates each attribute, when it
     updates, when it expires, and who prevents forgery. A polished policy grammar over unreliable
     attributes is not security.
5. Stop RBAC when role names become condition strings.
   - `tenantA_projectB_editor`, `enterprise_korea_support_manager`, and `night_shift_refund_approver`
     are attributes and relationships compressed into strings. They multiply with every customer,
     region, project, plan, and action.
   - Keep the stable job part in RBAC, move project membership and object sharing to ReBAC, and
     move region, device, and time conditions to ABAC.
6. Design multi-tenant SaaS as a hybrid from the start.
   - Pure RBAC is usually the wrong choice for B2B SaaS. Express organization-user membership and
     project or document sharing with ReBAC, internal jobs such as billing manager, auditor, and
     member with RBAC, and device, region, risk, and object-state limits with ABAC.
   - Combine the models per rule, for example: the user may edit the document only when they are a
     member of the organization, an editor of the document, and the account is not suspended.
7. Choose the model by who owns the permission data.
   - If HR or IAM administrators change permissions, RBAC data is the source of truth. If users
     change permissions through invite, share, and move features, the product's relation graph is
     the source of truth and ReBAC fits. If device management, risk detection, or object metadata
     participate in decisions, ABAC is needed.
   - Prefer a simpler model over a more expressive one built on untrusted attributes or slowly
     updated relations. Input reliability and update speed come before model expressiveness.

<!-- mustflow-section: postconditions -->
## Postconditions

- The granting basis, model choice, role inventory, attribute pipeline, hybrid boundaries, and
  permission-data ownership are explicit.
- Model-name-first choices, combinatorial role explosion, attributes compressed into role names,
  and expressive models over unreliable inputs are fixed or reported.
- Model-selection claims are backed by business-rule and data-ownership evidence or labeled as
  manual-only or missing.

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

Prefer the narrowest configured tests that prove the selected model expresses the real rules:
membership and sharing paths for ReBAC, role assignment for RBAC, and attribute freshness and
failure behavior for ABAC.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the granting basis, attribute pipeline, or permission-data ownership is unclear, report the
  missing evidence instead of recommending a model.
- If the fix requires permission implementation changes, use `auth-permission-change` before editing
  that scope.

<!-- mustflow-section: output-format -->
## Output Format

- Authorization model reviewed
- Business rules and granting-basis findings
- Model selection and hybrid-boundary findings
- Role inventory and explosion findings
- Attribute source-of-truth findings
- Permission-data ownership findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining authorization-model risk
