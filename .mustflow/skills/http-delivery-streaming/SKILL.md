---
mustflow_doc: skill.http-delivery-streaming
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: http-delivery-streaming
description: Apply this skill when HTTP delivery, content coding, compression negotiation, CDN or proxy caching, streaming responses, Server-Sent Events, WebTransport, WebSocket fallback, HTTP/2 or HTTP/3 transport behavior, browser EventSource or WebTransport clients, reverse-proxy buffering, connection limits, reconnect behavior, or delivery observability is created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.http-delivery-streaming
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# HTTP Delivery Streaming

<!-- mustflow-section: purpose -->
## Purpose

Keep HTTP delivery behavior explicit instead of treating it as a harmless header, proxy, or client-library detail. Compression, cache variation, streaming flush behavior, reconnect semantics, HTTP version behavior, and browser transport fallback are part of the user-visible and operator-visible contract.

This skill is for the awkward layer where a feature looks correct in route code but fails because a proxy buffered it, a cache ignored `Vary`, a browser cannot send the header the server expects, a datagram was treated as reliable, or a compression setting made tail latency worse.

<!-- mustflow-section: use-when -->
## Use When

- HTTP response delivery, `Content-Encoding`, `Accept-Encoding`, `Vary`, `Cache-Control`, `ETag`, range requests, static asset precompression, CDN compression, or origin compression changes.
- zstd, gzip, brotli, dictionary compression, compression dictionary transport, `.zst` artifacts, compressed archives, patches, or delivery metadata are introduced, reviewed, or documented.
- Streaming responses, Server-Sent Events, `EventSource`, `text/event-stream`, heartbeat comments, reconnect behavior, event replay, `Last-Event-ID`, or proxy buffering behavior changes.
- WebTransport, HTTP/3, QUIC, datagrams, bidirectional streams, unreliable latest-state delivery, or WebSocket/SSE/long-poll fallback changes.
- Reverse proxy, CDN, edge worker, load balancer, framework adapter, route handler, worker handler, or browser client behavior can change whether bytes flush, cache, decompress, reconnect, or arrive in order.
- Performance, reliability, auth, permission, privacy, or observability claims depend on bytes transferred, compression ratio, streaming latency, connection count, fallback path, reconnect rate, or transport metrics.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change only edits an API JSON schema, route shape, status code, or generated client with no delivery, cache, compression, streaming, or transport behavior; use `api-contract-change`.
- The change only improves general runtime performance with no HTTP delivery or streaming surface; use `performance-budget-check`.
- The task only changes authentication or permission policy with no browser delivery, cache, cookie, CORS, signed URL, or streaming token behavior; use `auth-permission-change`.
- The task only changes an external provider adapter unrelated to HTTP delivery or browser transport behavior; use `adapter-boundary`.
- The user explicitly asks for a rough offline note and accepts that browser, proxy, CDN, or standards freshness is unverified.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Delivery surface: static asset, API response, file download, archive, streaming route, SSE channel, WebTransport session, WebSocket fallback, CDN rule, proxy rule, or browser client.
- Route or asset ledger: URL, method, status, media type, response size range, cacheability, auth requirement, tenant or user variance, and caller types.
- Header ledger: `Content-Type`, `Content-Encoding`, `Accept-Encoding`, `Vary`, `Cache-Control`, `ETag`, `Last-Event-ID`, `Retry-After`, `Content-Disposition`, CORS, cookies, credentials mode, range request headers, and compression dictionary headers when relevant.
- Delivery path: origin, framework adapter, reverse proxy, CDN, edge worker, service worker, load balancer, HTTP version, TLS/ALPN, QUIC/UDP availability, and browser support assumptions.
- Streaming behavior: flush point, heartbeat interval, replay buffer, reconnect policy, backpressure, cancellation, per-tenant isolation, and fallback behavior.
- Compression behavior: selected content coding, fallback coding, window or decoder compatibility constraints, compression level, CPU budget, dictionary availability, dictionary freshness, and cache-key variance.
- Observability evidence: selected encoding, cache status, proxy status, client fallback, reconnect count, RTT, bytes sent, queue age, replay misses, drop estimate, and error categories.
- Relevant command-intent contract entries for lint, build, related tests, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- If official standard, browser-support, proxy-default, CDN-default, or runtime-support claims are written durably, use official or repository-approved source evidence and avoid stale "latest" wording.
- If the delivery change affects request/response schema, public headers, generated clients, or docs, also use `api-contract-change`.
- If private data, credentials, signed URLs, cookies, CORS, tenant isolation, or permission caches are involved, also use `auth-permission-change` or `security-privacy-review`.
- If the change is motivated by speed, bandwidth, tail latency, CPU cost, or connection pressure, also use `performance-budget-check`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update route handlers, response headers, streaming adapters, proxy/CDN configuration, browser transport clients, fallback code, tests, docs, and directly synchronized templates tied to the delivery behavior.
- Add delivery fixtures, contract tests, integration tests, browser-client tests, and docs examples when repository surfaces support them.
- Add explicit fallback, feature-detection, cache-variance, replay, heartbeat, timeout, reconnect, and observability behavior.
- Do not silently add compression, buffering changes, cache sharing, streaming transports, or browser feature assumptions without naming the caller and fallback contract.
- Do not use raw browser, proxy, package-manager, server, or benchmark commands unless they are configured oneshot command intents.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the delivery surface:
   - static asset or file download;
   - API response compression;
   - compression dictionary transport;
   - large archive, patch, or range-readable payload;
   - streaming HTTP response;
   - Server-Sent Events;
   - WebTransport;
   - WebSocket, long-poll, or fallback channel;
   - proxy, CDN, edge, service-worker, or framework adapter rule.
2. Build a delivery ledger before editing:
   - route or asset path, method, status, media type, response size, cacheability, auth requirement, and caller list;
   - selected headers, cache key, `Vary` dimensions, compression choice, proxy/CDN path, HTTP version assumption, fallback path, and observability fields.
3. Keep content coding separate from media type and file naming.
   - A precompressed file extension such as `.zst` is an origin artifact, not the browser-facing contract by itself.
   - Serve the original media type plus the negotiated `Content-Encoding`.
   - Use `Vary: Accept-Encoding` or an equivalent cache-key rule whenever the same URL can produce different encodings.
   - Do not let a CDN cache one encoded variant for clients that did not negotiate it.
   - Check decoder compatibility constraints, compression level, CPU cost, and p95/p99 latency before calling a smaller payload a faster response.
4. Treat zstd HTTP content coding as negotiated delivery, not a universal asset format.
   - Keep a supported fallback for clients, proxies, or CDNs that do not negotiate it.
   - Avoid tiny-payload wins that spend more CPU than bandwidth saved.
   - Keep any content-coding window or decoder-limit claim tied to official sources or repository evidence.
   - For generated `.zst` artifacts, distinguish browser delivery from archive download, package artifact, or internal cache storage.
5. Treat compression dictionary transport as an explicit compatibility feature.
   - Feature-detect or negotiate dictionary use; never require it for first contact unless a closed client contract says so.
   - Make dictionary identity, freshness, invalidation, cache key, and fallback behavior explicit.
   - Keep dictionary selection deterministic enough that a proxy, service worker, or CDN cannot mix incompatible dictionary and response pairs.
   - Report browser, CDN, proxy, and framework support as dated or verified evidence, not as a memory claim.
6. For large archives, deltas, logs, or patch payloads, define the read model.
   - If callers need random access, partial download, verification, or resume, design chunking, indexing, frame boundaries, metadata, checksums, and range behavior before choosing a compression format.
   - Treat checksums as corruption detection. They are not signatures or authorization.
   - Keep decompression limits and zip-bomb style expansion risk in the security review path when untrusted content is accepted.
7. For Server-Sent Events, design the event stream as a contract.
   - SSE is server-to-client. Do not smuggle client commands into an event stream design.
   - Define event names, `id`, data shape, replay buffer, `Last-Event-ID` handling, `retry`, and heartbeat comments.
   - Account for browser `EventSource` limitations such as URL-based `GET`, credential behavior, and restricted custom request headers.
   - Choose cookies, signed URLs, CORS, or a separate token exchange deliberately when auth is needed.
   - Disable or bypass proxy buffering where required, flush early, and send small heartbeat or comment frames often enough to keep intermediaries from deciding the connection is idle.
   - Consider HTTP/1 connection limits, HTTP/2 stream behavior, tab count, and same-origin pressure.
   - Handle backpressure, cancellation, slow clients, reconnect storms, and replay misses.
8. For WebTransport, design the transport protocol instead of treating it as faster WebSocket.
   - Confirm secure context, HTTP/3, QUIC/UDP, certificate, proxy, load balancer, firewall, and ALPN path assumptions.
   - Use `ready` and `closed` lifecycle handling; do not treat construction as a connected state.
   - Use datagrams only for lossy latest-state or telemetry-style data where drops are acceptable.
   - Use streams for reliable commands, state transitions, payments, writes, and ordered data.
   - Add sequence numbers, timestamps, idempotency keys, and application-level ordering when messages cross datagrams and streams.
   - Keep worker/off-main-thread behavior in view when encoding, decoding, or fan-out can block UI responsiveness.
   - Provide WebSocket, SSE, or long-poll fallback when the product cannot require WebTransport-capable networks and browsers.
9. Check proxy, CDN, and edge behavior as part of the feature.
   - Name where compression happens: origin, proxy, CDN, edge worker, service worker, or build artifact.
   - Name where buffering happens and whether the streaming route can flush.
   - Name where HTTP/2 or HTTP/3 terminates and what the origin actually receives.
   - Name cache variance for auth, tenant, language, content coding, dictionary, range requests, and private responses.
   - Do not cache private event streams, signed URLs, or tenant-specific responses as public assets.
10. Keep delivery concerns out of core business logic.
    - Use adapters or transport modules to translate EventSource, WebTransport, WebSocket, compression, cache, and proxy details into internal events or commands.
    - Do not let datagram loss, browser reconnect, CDN cache keys, or compression dictionary ids become domain rules.
    - Use `adapter-boundary` when external protocol objects or framework response objects would otherwise leak into application services.
11. Add observability before trusting delivery behavior.
    - Record selected content coding, cache hit/miss, proxy or CDN status, response size, flush latency, reconnect count, last event id, replay miss count, client fallback, RTT, stream close reason, queue age, dropped datagrams estimate, and transport error class when relevant.
    - Keep metric labels bounded. Do not label metrics by full URL with unbounded query strings, raw user ids, tokens, dictionary hashes, or event payloads.
12. Verify with configured command intents.
    - Use lint, build, related tests, docs validation, release checks, and mustflow checks when available.
    - Report missing browser, proxy, CDN, compression-negotiation, stream-flush, or WebTransport integration coverage instead of inventing raw commands.

<!-- mustflow-section: postconditions -->
## Postconditions

- Delivery surface, route or asset ledger, selected headers, cache key, proxy/CDN path, and fallback path are explicit.
- Content coding, media type, file extension, and archive format are not conflated.
- zstd, dictionary compression, gzip, brotli, or other coding choices have fallback, cache variance, CPU, and compatibility behavior defined.
- SSE streams define event shape, heartbeat, replay, reconnect, auth, proxy buffering, cancellation, and slow-client behavior.
- WebTransport sessions define lifecycle, datagram versus stream reliability, fallback, network assumptions, and observability.
- Private, tenant-specific, credentialed, or signed responses are not accidentally made cache-public.
- Transport, proxy, CDN, and browser details are contained at adapter or delivery boundaries rather than leaking into core logic.
- Delivery and performance claims are backed by configured verification, source evidence, or clearly reported as unverified.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured checks that prove the changed delivery behavior. Report missing browser, proxy, CDN, HTTP/2, HTTP/3, stream-flush, EventSource reconnect, WebTransport fallback, or compression-negotiation verification when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a compressed response decodes incorrectly, first check `Content-Type`, `Content-Encoding`, `Accept-Encoding`, `Vary`, cache key, and double-compression before changing application payloads.
- If streaming appears batched, check proxy buffering, framework buffering, CDN behavior, flush calls, heartbeat cadence, and response transforms before blaming the client.
- If SSE reconnects repeat or miss events, check event ids, replay buffer, heartbeat, retry interval, connection limits, auth expiry, and slow-client cancellation.
- If WebTransport works locally but fails in production, check HTTP/3, QUIC/UDP, ALPN, certificates, proxy/load-balancer support, firewall behavior, and fallback path.
- If a cache serves private or wrong-encoding data, fail closed, disable or narrow caching, and report the cache-key or `Vary` defect.
- If official support or standard details cannot be verified, keep wording conservative and report the freshness boundary.

<!-- mustflow-section: output-format -->
## Output Format

- Delivery surface classified
- Route or asset ledger
- Header, cache key, proxy/CDN, and HTTP version notes
- Content coding, dictionary, archive, or compression decision
- SSE, WebTransport, WebSocket, or fallback behavior when relevant
- Auth, CORS, cookie, signed URL, tenant, and private-cache notes when relevant
- Backpressure, cancellation, reconnect, replay, timeout, and buffering behavior
- Observability fields added or required
- Tests, fixtures, browser/proxy checks, or docs synchronized
- Command intents run
- Skipped verification and reasons
- Remaining delivery or streaming risk
