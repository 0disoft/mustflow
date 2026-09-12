---
mustflow_doc: skill.sui-wallet-signing-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-wallet-signing-review
description: Review Sui wallet signing, personal-message challenges, signer custody, weighted multisig, and sponsored transaction authorization.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-wallet-signing-review
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui Wallet and Signing Review

<!-- mustflow-section: purpose -->
## Purpose

Review Sui wallet signing, personal-message challenges, signer custody, weighted multisig, and sponsored transaction authorization.

<!-- mustflow-section: use-when -->
## Use When

A Sui application changes wallet authentication, final-byte signing policy, operational signers, multisig approval, or sponsor authorization.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

Use auth-permission-change for ordinary sessions without Sui signing. Use sui-ptb-composition-review for command composition without signer authority. A wallet connection or a successful signature check alone does not establish an application session.

<!-- mustflow-section: required-inputs -->
## Required Inputs

Signer and wallet implementation, installed SDK and dApp Kit versions, chain/account binding, challenge store, final transaction bytes or a synthetic decoded fixture, sponsor policy, and allowed business operation.

Refresh version-sensitive details against the installed SDK and target network before using API examples or capability claims. Starting references: [Cryptography](https://sdk.mystenlabs.com/sui/cryptography), [Sponsored transactions](https://docs.sui.io/develop/transaction-payment/sponsor-txn), [Multisig](https://sdk.mystenlabs.com/sui/cryptography/signers/multisig).

<!-- mustflow-section: preconditions -->
## Preconditions

The target is a Sui integration and the requested scope matches this procedure. Read the target repository's command contract. Use synthetic/redacted fixtures for review; this skill does not authorize live signing, asset movement, key access or deployment.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

Change only the relevant application adapters, policy, builder or consumer logic, focused fixtures/tests, and documentation requested by the task. Preserve existing authority and secret boundaries; supporting skills do not grant command permissions.

<!-- mustflow-section: procedure -->
## Procedure

1. Separate personal-message intent from transaction intent. Bind a login challenge to the service domain, purpose, account, network, nonce and expiry; verify the stored original message and expected address, then atomically consume the nonce before issuing a session. Reject replay and concurrent reuse. A message used as withdrawal approval is authorization, even if it is not a chain transaction.

2. Bind asynchronous wallet requests to the initiating account and chain. On a switch, invalidate unsigned plans and recheck the returned account, bytes and request identity. UI cancellation cannot revoke an already issued signature. Use the installed SDK's address-aware verification for zkLogin rather than assuming one public-key-derived address.

3. Keep user seed phrases in the user's wallet for normal dApp flows. Put operational signing behind a Signer boundary and a business allowlist; a KMS does not make an unrestricted signing service safe. Treat encoded private keys as secrets, verify restored signer identity, and never log raw keys or signed payloads.

4. For multisig, enumerate which weighted signer sets meet the threshold and whether one custody failure can expose a sufficient set. Model rotation as address/capability and asset migration where the configuration changes the multisig address.

5. Inspect the complete finalized PTB: sender, every command and target, type arguments, recipients, assets, amounts, capability objects, gas budget and expiry. Recheck after plugins, coin resolution or sponsor gas completion. Approve and sign those exact bytes; any later mutation requires fresh authorization and signatures.

6. For sponsorship, require the applicable parties to sign the same complete transaction. Transaction-kind bytes omit gas and are not final approval. Enforce sponsor asset limits server-side, including GasCoin consumption. useGasCoin: false is a builder option, not an authorization check.

7. Exercise replay, wrong domain/chain/account, account switch during signing, an appended transfer after an allowed Move call, sponsor-funded spending and a threshold met by one heavy key. Use synthetic transactions and mock signers; do not request real keys or submit transfers for a document review.

<!-- mustflow-section: postconditions -->
## Postconditions

Expected evidence: nonce consumption is atomic; policy inspects final bytes; rejected appended commands cannot reach signing; sponsor and multisig authority match the stated approval policy.

Distinguish inspected code, mocked behavior, simulation and live-chain evidence. Do not report a stronger result than the observed evidence supports.

<!-- mustflow-section: verification -->
## Verification

Use the target repository's configured `test_related` and `build` intents when they cover the changed boundary. For mustflow-native skill/template changes, use configured `mustflow_check`. Run only eligible one-shot intents; these names are references, not permission to execute an unconfigured command.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If final bytes, supported signature scheme, chain binding or sponsor policy cannot be established, leave signing unavailable and identify the missing input. Preserve an already signed transaction for restricted recovery; do not treat UI cancellation as revocation.

<!-- mustflow-section: output-format -->
## Output Format

Report the signing purpose, authority boundary, challenge lifecycle, exact-byte approval path, sponsor and multisig findings, focused test evidence, and unresolved authorization questions.
