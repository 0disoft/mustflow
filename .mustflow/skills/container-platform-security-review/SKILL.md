---
mustflow_doc: skill.container-platform-security-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: container-platform-security-review
description: Apply this skill when Docker or Kubernetes platform security needs review for image digests and signing, registry trust, admission policy, Pod Security Standards, container runtime isolation, rootless containers, Docker socket and group access, namespace tenancy, node pools, NetworkPolicy, service account tokens, projected tokens, workload identity, Secret mounting, etcd encryption, or container escape blast radius.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.container-platform-security-review
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

# Container Platform Security Review

<!-- mustflow-section: purpose -->
## Purpose

Review container and Kubernetes security as platform-level trust decisions, not as per-Pod YAML
checklists that developers are expected to remember.

The review question is not "does this image scan clean?" It is "what does a container escape or a
stolen service-account token let an attacker reach, and does admission refuse the unsafe Pod before
it exists?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports Docker or Kubernetes platform security: image build,
  signing, and registry trust, admission policy, Pod Security Standards, runtime isolation,
  service accounts and tokens, NetworkPolicy, Secret mounting, etcd encryption, or cluster
  multi-tenancy.
- A change affects what a compromised container, node credential, or service-account token can
  reach.
- A review needs proof that unsafe workloads are rejected at admission and that a container escape
  does not become a host or cluster compromise.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is application-layer trust boundaries or per-service credentials; use
  `trust-boundary-review`.
- The task is network segmentation, SSH, or admin access outside the container platform; use
  `infrastructure-access-review`.
- The task is a specific image, video, or PDF transform worker; use `media-transform-worker-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Image ledger: registries, tags versus digests, signing and provenance, and which images production
  may run.
- Admission ledger: enforced Pod Security Standards, denied features, exception owners and expiry.
- Runtime ledger: user, capabilities, seccomp, AppArmor, SELinux, read-only root filesystems, and
  privileged or host-namespace workloads.
- Identity ledger: service accounts, token automation, projected tokens, workload identity, and
  which workloads may create or exec into Pods.
- Network ledger: NetworkPolicy coverage, the enforcing CNI, and default-deny posture.
- Tenancy ledger: which workloads share clusters, node pools, and sandboxed runtimes.
- Existing security docs and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing image, admission, runtime, identity, network, or
  tenancy evidence can be reported without guessing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten image trust, admission policy, runtime isolation, service-account and token
  controls, NetworkPolicy, tenancy boundaries, and etcd protection, and directly synchronized
  documentation or templates owned by the selected boundary.
- Update platform runbooks, docs, and tests that describe the same contract.
- Do not add raw kubectl, Docker, or cluster-admin commands, or new command authority under this
  skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Treat the registry and build pipeline as the production trust anchor.
   - Image tags change; deploy by image digest, not by `latest` or a mutable version tag. Have a
     trusted builder sign images and provenance, and verify signature, builder, source repository,
     and allowed registry at admission, rejecting images that do not meet the conditions.
   - A vulnerability scan alone does not prove the image being deployed is the image that was
     scanned.
2. Enforce security settings at admission, not in docs or Helm defaults.
   - Apply Pod Security Standards Restricted by default in application namespaces. Block privileged
     execution, host namespaces, hostPath, runtime socket mounts, disallowed capabilities, root
     execution, unsigned images, and automatic service-account token mounting in the policy engine.
   - Grant exceptions per workload with an owner and expiry, never per whole namespace, and stop
     expecting developers to remember security options.
3. Treat container root and Docker control as host root.
   - Docker group membership and Docker socket access are effectively host administrator rights.
     Run containers as a non-root UID with rootless mode or user namespaces, drop capabilities,
     forbid privilege escalation, and use a read-only root filesystem.
   - Privileged containers, host-root directory mounts, and runtime-socket mounts remove isolation;
     keep infrastructure agents that need such rights off application nodes.
4. Do not treat a Namespace as a strong tenant boundary.
   - Namespaces and RBAC are management units; they provide no independent kernel, node, or control
     plane. Hostile tenant code, SaaS workloads running arbitrary code, and high-privilege platform
     agents must not share a cluster or node with ordinary applications.
   - Separate trust levels into different clusters, or at minimum dedicated node pools with
     sandboxed runtimes. Kubernetes has no first-class notion of a hardened tenant.
5. Make NetworkPolicy effective, not decorative.
   - A NetworkPolicy file does nothing without an enforcing CNI, and pods not selected by any policy
     are allowed by default. Default-deny ingress and egress in every namespace first, then add only
     needed communication, listing DNS, required external APIs, cloud metadata, and the Kubernetes
     API explicitly.
   - NetworkPolicy limits network reachability only; it is not user authorization.
6. Default-deny automatic service-account tokens.
   - Applications that never call the API should not carry an automatically mounted service-account
     token; a remote-code-execution bug then becomes cluster-API credential theft. Disable
     `automountServiceAccountToken` by default and give only needed workloads a dedicated service
     account with minimal RBAC.
   - Use short-lived, audience-bound, Pod-bound projected tokens from TokenRequest and retire
     long-lived service-account token Secrets.
7. Treat workload-creation rights as secret-read rights.
   - A user who can create Pods or Deployments in a namespace can mount Secrets and read their
     values, so blocking direct Secret `get` alone is useless. Restrict workload create and update
     rights, exec access into running containers, and service-account use together.
   - Enable etcd encryption with envelope encryption through an external KMS, and control etcd
     backups and API-server access with the same sensitivity.

<!-- mustflow-section: postconditions -->
## Postconditions

- Image trust, admission enforcement, runtime isolation, service-account and token controls,
  NetworkPolicy, tenancy boundaries, and etcd protection are explicit.
- Tag-based deploys, doc-only security defaults, privileged and host-namespace workloads,
  namespace-as-tenant, and auto-mounted tokens are fixed or reported.
- Container-platform claims are backed by configured tests, admission and runtime evidence, or
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

Prefer the narrowest configured tests that prove admission rejects unsafe workloads, NetworkPolicy
defaults to deny, tokens are audience-bound and short-lived, and a workload without API access
carries no token.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If image, admission, runtime, identity, network, or tenancy evidence is missing, report the gap
  instead of claiming the platform is hardened.
- If an unsafe workload can be created outside admission, report the bypass path before other work.
- If the fix requires infrastructure-access, trust-boundary, or cloud-IAM changes, use the matching
  skill before editing that scope.

<!-- mustflow-section: output-format -->
## Output Format

- Container platform security reviewed
- Image trust and admission findings
- Runtime isolation and privilege findings
- Service-account and token findings
- NetworkPolicy and tenancy findings
- Secret and etcd findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining container-platform risk
