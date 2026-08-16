---
mustflow_doc: skill.infrastructure-access-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: infrastructure-access-review
description: Apply this skill when infrastructure access and isolation need review for network segmentation, microsegmentation, firewall and security-group policy, east-west and egress traffic, management plane separation, SSH certificates, VPN and Bastion access, Zero Trust admin access, just-in-time infrastructure privileges, server and VM admin rights, workload identity, deployment and data rights separation, cloud control-plane permissions, Linux capabilities, seccomp, AppArmor, SELinux, or emergency access paths.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.infrastructure-access-review
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

# Infrastructure Access Review

<!-- mustflow-section: purpose -->
## Purpose

Review infrastructure access as a set of short-lived, request-scoped decisions — not as a
membership in a network, a VPN, or an admin role.

The review question is not "is this server inside the VPC?" It is "what can this identity modify,
delete, or read right now, how long does the permission live, and what happens to the blast radius
if this one credential is stolen?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports network segmentation, firewall or security-group
  policy, egress and east-west traffic policy, management plane isolation, SSH certificate
  issuance, VPN or Bastion access, Zero Trust access gates, just-in-time infrastructure
  privileges, server or VM admin rights, workload identity, deployment and data rights separation,
  cloud control-plane permissions, or emergency access paths.
- A review needs proof that a stolen admin account, CI runner, or workload credential cannot move
  to another zone, erase evidence, or destroy backups.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is trust boundaries or per-service credentials at the application layer; use
  `trust-boundary-review`.
- The task is the admin or operator control plane for a product backoffice; use
  `admin-control-plane-safety-review`.
- The task is Docker or Kubernetes platform security specifically; use
  `container-platform-security-review`.
- The task is cloud IAM, service accounts, or secret management; use
  `tenant-key-secret-isolation-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Zone ledger: trust tiers and blast-radius ratings per network segment, cloud account, project,
  cluster, and database role.
- Traffic ledger: communication contracts with source subject, destination service, protocol, port,
  direction, purpose, owner, expiry, and expected traffic per rule.
- Access ledger: who or what can reach management planes, SSH, RDP, Kubernetes API, databases, and
  backup systems, and through which paths.
- Privilege ledger: standing versus just-in-time rights, workload identities, and deployment versus
  data permissions.
- Emergency ledger: break-glass accounts, independent authentication paths, and their alert and
  rotation behavior.
- Existing security docs and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing zone, traffic, access, privilege, or emergency evidence
  can be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten zone separation, traffic contracts, management-plane isolation, short-lived SSH
  and admin sessions, just-in-time privileges, workload identity, rights separation, and emergency
  paths, and directly synchronized documentation or templates owned by the selected boundary.
- Update network and access docs, runbooks, and tests that describe the same contract.
- Do not add raw firewall, SSH, or cloud-console commands, or new command authority under this
  skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Split zones by breach-propagation path, not by org chart or by network membership.
   - Internet-exposed tiers, internal APIs, data stores, build systems, management planes,
     observability, and backups need separate zones with different trust levels and blast-radius
     ratings; a web server and its database belong to separate segments even in the same service.
   - Network location, VPN membership, the same VPC, or the same cluster is not a trust basis;
     authorize per identity, workload, device, resource, action, and risk on every request.
2. Treat Tier 0 systems as the first isolation priority.
   - IdP, PKI, KMS, Secret Manager, DNS, time sync, CI/CD, audit logs, and backups are more
     sensitive than ordinary services. An application admin who can modify authentication policy,
     deploy pipelines, logs, or backups is effectively a full infrastructure admin.
   - Give Tier 0 separate accounts and projects, separate admin roles, and separate access paths.
3. Separate the management plane from the service plane in both directions.
   - Management APIs, hypervisors, Kubernetes API, SSH, RDP, and database management ports must not
     sit on the user-traffic network. Production workloads cannot reach the management plane, and
     management accounts cannot read business data without separate approval. A management network
     that reuses the same admin accounts is not separation.
   - Route admin access through dedicated accounts, endpoints, networks, and bastions, and require
     phishing-resistant MFA on privileged accounts.
4. Default-deny east-west and egress traffic.
   - Most organizations filter inbound tightly while allowing all internal server-to-server traffic
     and `0.0.0.0/0` outbound. That lets a compromised server scan internally, steal credentials,
     and exfiltrate data.
   - Manage communication contracts instead of ad hoc firewall rules: record source subject,
     destination service, protocol, port, direction, purpose, owner, expiry, and expected traffic,
     generate firewall and security-group config from policy code, and enforce the same model at
     network and workload boundaries. Restrict DNS, cloud metadata, and package repositories
     separately, and route external communication through an authenticated egress proxy.
5. Replace standing admin rights with short-lived, scoped loans.
   - Remove standing `root`, `Administrator`, `Owner`, and `cluster-admin` rights. Activate rights
     per request with MFA, work reason, target resource, approver, and expiry, and auto-revoke at
     expiry; scope by resource and action, not by an eight-hour role grant.
   - Emergency accounts stay login-disabled on a separate path and alert immediately on use.
6. Give people and workloads separate identities with minimal rights.
   - Do not share one VM role, Kubernetes node credential, or service account across applications
     or environments; issue per-workload short-lived, target-bound tokens and retire long-lived
     secrets in images and `.env` files. Give every process a dedicated service account without a
     login shell or home directory, and bound `sudo` to exact commands and arguments instead of
     blanket grants.
   - Separate deployment rights from data rights: a deploy system replaces images but cannot read
     production data, and a data operator queries and recovers but cannot modify IAM, audit logs, or
     backup retention policy.
7. Replace servers instead of repairing them.
   - Manage infrastructure and security policy as code with validated images and declarative
     deploys. Emergency manual changes auto-expire and are forced back to the IaC state; standing
     SSH into production for configuration edits creates drift and untracked privileges.
8. Treat SSH, VPN, and bastions as disposable, short-lived relays.
   - VPN success is not admin authority; re-authorize per server, device posture, target, action,
     and time after the tunnel, and keep default deny on. Remove long-term SSH public keys in favor
     of short-lived SSH certificates from a central CA with principals, a key id carrying user and
     approval ticket, and no forwarding enabled by default.
   - Bastions are not shared management servers: use per-session isolated environments destroyed on
     exit, no admin home directories, cloud credentials, deploy keys, or browsers, and no outbound
     communication except approved targets. Record session causality, not only login events: user
     identity, device, approval, certificate key id, target, commands, file transfers, port
     forwards, privilege escalations, and subsequent cloud API calls under one session id, forwarded
     to a separate immutable store.
9. Quantify the blast budget of every credential.
   - For each credential class, compute how many servers, tenants, data sets, regions, and backup
     generations a single compromise could modify or delete, and walk the attack path as if the
     credential were stolen. If one credential can destroy two or more independent security zones,
     split the structure.
   - Never concentrate production deletion, backup deletion, key deletion, and audit-log deletion
     in one principal.
10. Keep emergency access independent of the normal authentication path.
    - If IdP, VPN, and conditional-access policy all fail, normal admin accounts cannot recover.
      Maintain at least two break-glass accounts with separate authentication methods,
      phishing-resistant hardware, and dedicated managed devices; alert on every use, rotate
      credentials after use, and test real login and recovery regularly. An emergency account bound
      to the same IdP and policy is decoration.

<!-- mustflow-section: postconditions -->
## Postconditions

- Zone separation, traffic contracts, management-plane isolation, short-lived admin and SSH
  sessions, workload identity, rights separation, blast budgets, and emergency paths are explicit.
- Network-membership trust, standing admin rights, shared workload credentials, always-on egress,
  and shared emergency accounts are fixed or reported.
- Infrastructure-access claims are backed by configured tests, policy and access evidence, or
  labeled as manual-only or missing.

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

Prefer the narrowest configured tests that prove east-west and egress denial, short-lived rights
expiry, per-workload identity isolation, and emergency-path independence.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If zone, traffic, access, privilege, or emergency evidence is missing, report the gap instead of
  claiming the infrastructure is segmented.
- If a network or VPN membership is the only control, report the missing per-request authorization.
- If the fix requires trust-boundary, admin-plane, container, or cloud-IAM changes, use the
  matching skill before editing that scope.

<!-- mustflow-section: output-format -->
## Output Format

- Infrastructure access reviewed
- Zone and Tier-0 separation findings
- Traffic and egress contract findings
- Management-plane and admin-access findings
- Privilege and workload-identity findings
- Blast-budget and emergency-path findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining infrastructure-access risk
