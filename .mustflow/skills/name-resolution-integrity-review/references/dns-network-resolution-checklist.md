# DNS and Network Resolution Checklist

Use this checklist when hostnames resolve differently across applications, containers, VPNs,
proxies, browsers, operating-system resolvers, recursive resolvers, or network locations.

## Contents

1. [Execution-space capsule](#execution-space-capsule)
2. [Resolver API and runtime behavior](#resolver-api-and-runtime-behavior)
3. [Resolver stack](#resolver-stack)
4. [Query transformation](#query-transformation)
5. [Split DNS and route selection](#split-dns-and-route-selection)
6. [Recursive, authoritative, and delegation boundaries](#recursive-authoritative-and-delegation-boundaries)
7. [Proxy and application resolution ownership](#proxy-and-application-resolution-ownership)
8. [Local name sources](#local-name-sources)
9. [Cache and freshness ledger](#cache-and-freshness-ledger)
10. [Response taxonomy](#response-taxonomy)
11. [Transport and message size](#transport-and-message-size)
12. [DNSSEC and validation](#dnssec-and-validation)
13. [CDN and resolver location](#cdn-and-resolver-location)
14. [Alias and service records](#alias-and-service-records)
15. [Container and cluster name scopes](#container-and-cluster-name-scopes)
16. [Address selection, connection reuse, and routing](#address-selection-connection-reuse-and-routing)
17. [Evidence matrix](#evidence-matrix)
18. [Failure matrix](#failure-matrix)
19. [Invariants](#invariants)
20. [Skill handoffs](#skill-handoffs)

## Execution-space capsule

Capture the failing request where it actually runs. Record:

- executable and runtime identity;
- host, container, pod, network namespace, service manager, user, and security context;
- interface and route table visible to the process;
- resolver configuration files and generated ownership of those files;
- hosts, name-service switch, search-domain, and local discovery configuration;
- VPN, proxy, browser, runtime, and enterprise policy state;
- request time, monotonic sequence, and relevant configuration generation;
- exact hostname spelling, trailing-dot state, record kind, address family, and API used.

A query from the host shell is a control, not evidence about a process in another namespace. Capture
the pre-change state before restarting a pod, reconnecting a VPN, replacing a generated resolver
file, or flushing any cache.

## Resolver API and runtime behavior

Name the exact application API before comparing results. On one host, one runtime API can delegate
to the operating-system name-service path while another sends DNS questions directly. A runtime may
also select a native or built-in resolver by build mode, environment, callback injection, or startup
configuration. Record:

- API and call-site identity, including address-family and canonical-name options;
- native, built-in, browser, proxy, or custom resolver mode;
- whether hosts, name-service switch, local discovery, split-DNS routing, and OS policy apply;
- runtime-local positive, negative, failure, and stale-cache behavior;
- configuration snapshot and process start generation that selected the mode.

A direct DNS protocol probe proves one server's response to one QNAME and record kind. It does not
prove that the application generated that question, used that server, accepted that response, or
selected an address from it. Compare controls through the same API and process boundary first.

## Resolver stack

Draw the actual stack rather than assuming one system resolver:

1. application literal, internal host map, or connection pool;
2. application or language-runtime resolver and cache;
3. browser secure resolver, proxy resolver, or custom client library;
4. hosts, name-service switch, mDNS, LLMNR, and operating-system stub;
5. local forwarding or caching daemon;
6. node-local, cluster, VPN, enterprise, or ISP recursive resolver;
7. authoritative DNS, CDN steering, and delegated providers;
8. address selection, kernel routing, proxy connection, and transport handshake.

For each layer, record whether it received the request, transformed it, answered from cache, forwarded
it, rejected it, or never saw it. A missing packet on the ordinary DNS port does not prove the
application made no DNS request; the request may have hit a cache or used an encrypted transport.

## Query transformation

Preserve the difference between the user-visible input and transmitted questions:

- relative versus absolute hostname;
- trailing dot present or absent;
- dot-count or other search-trigger rule;
- ordered search suffixes and generated candidate names;
- record kinds requested separately or in parallel;
- canonicalization, case, internationalized-name conversion, and escape handling;
- alias following, retry, fallback, and alternate service-name generation.

Record every QNAME and record kind in order. A short name, a multi-label relative name, and an
absolute fully qualified name can enter different search paths. An internal wildcard may turn a
wrong search candidate into a successful but incorrect endpoint.

## Split DNS and route selection

Treat split DNS as a routing table for queries, not as a flat server list. Record:

- link or interface owning each resolver;
- route-only and search domains;
- longest or otherwise most-specific domain match;
- default-route eligibility;
- resolver and link priority, including policies that exclude lower-priority links;
- catch-all routes;
- VPN connection generation and stale routes after reconnect;
- fallback behavior when the selected link times out or rejects the query.

Prove which link and server were selected for the exact candidate name. A stub address in a generated
resolver file only identifies the next local hop; it does not reveal upstream selection.

Do not model several configured servers as equivalent load-balancing targets. A resolver may prefer
one server until timeout, remember a working server, or fail over differently by link or query scope.
Record selection state, retry order, timeout class, and whether every candidate server serves the same
zones and policy. Inconsistent primary and fallback servers create stable per-process disagreement,
not harmless redundancy.

## Recursive, authoritative, and delegation boundaries

Keep these observations separate:

- the response used by the failing application or its recursive resolver;
- each authoritative server's non-recursive answer and zone generation;
- parent delegation NS and glue needed to reach the child zone;
- child-zone NS, address records, aliases, and service records;
- DS, DNSKEY, signatures, and denial-of-existence proofs when validation applies.

A fresh authoritative record does not invalidate an older recursive cache. A recursive cache hit does
not prove the authoritative path still works. Public trace-style delegation walks can bypass private
forwarders, split DNS, search expansion, and policy, so use them only for the delegation boundary they
actually traverse.

Compare all authoritative servers when answers are intermittent. Record zone generation, authority
flags, record sets, and transfer or publication state; do not collapse mixed old and new authoritative
answers into a client-cache diagnosis. Parent delegation, glue, child NS, service data, and validation
records have independent freshness windows. Lowering a leaf address TTL does not accelerate repair of
stale delegation, glue, or validation data.

## Proxy and application resolution ownership

Name who converts a hostname to an address:

- client before connecting to a proxy;
- proxy after receiving the unresolved hostname;
- tunnel or VPN endpoint;
- browser or runtime secure resolver;
- service mesh sidecar, gateway, or connection broker;
- remote execution or sandbox host.

Two proxy configurations that target the same proxy address can differ only in resolution ownership
and therefore see different private zones, CDN regions, hosts files, caches, or policies. Capture
whether the proxy request carried a hostname or an address and whether the client emitted a local
DNS request.

Keep resolution location separate from traffic egress. DNS may occur outside the tunnel while the
connection uses it, or the reverse.

## Local name sources

Before blaming authoritative DNS, inspect earlier sources and protocol namespaces:

- hosts files and managed host maps;
- name-service switch order;
- mDNS-reserved names and multicast routing;
- LLMNR or single-label discovery;
- container, cluster, service-mesh, and platform-generated names;
- application aliases, service registries, and hard-coded endpoints.

There is no universal `hosts -> DNS -> mDNS -> LLMNR` order. A name-service switch is a state machine,
not merely an ordered list: each module returns a status such as success, not found, unavailable, or
retryable failure, and status-specific actions decide whether lookup stops or continues. Capture the
module order, returned status, action modifier, and selected result from the failing namespace.

The same suffix can be interpreted by unicast DNS, multicast discovery, or a platform registry.
Single-label names and locally reserved suffixes can enter interface-scoped discovery or multiple
protocols in parallel. Record the protocol selected, interface scope, and rule that selected it.
Hosts files are inputs only to resolver paths that consult them; direct DNS APIs can bypass them.
Stale local entries can shadow correct DNS indefinitely because they do not obey authoritative TTLs.

## Cache and freshness ledger

Map caches from nearest to farthest:

- connection and endpoint pools;
- application and runtime caches;
- browser host and secure-DNS caches;
- operating-system stub and local forwarder caches;
- node-local and cluster DNS caches;
- recursive resolver caches;
- provider or authoritative synthesis caches.

For each cache, record key dimensions, positive or negative value, record kind, canonical name,
source, insertion time, original TTL or freshness rule, remaining lifetime, stale-serving policy,
validation state, and invalidation mechanism.

TTL is a per-entry upper freshness bound that begins when each cache inserts the record, not a global
propagation countdown. A safe planned cutover lowers freshness before changing the target and allows
previously inserted entries to expire under their old lifetime. Lowering TTL after the target changes
cannot shorten entries already cached with the old value.

Negative and failure results are cacheable under bounded policies. Distinguish name error from no
data: name error can cover the name across record kinds, while no data is tied to a present name and
requested kind. Also account for cached authenticated denial ranges that can synthesize negative
answers for names not previously queried. Stale-answer, prefetch, minimum-TTL, maximum-TTL, and
failure-cache policies can make observed lifetime differ from the authoritative value.

Track alias and target record sets independently because each has its own key and freshness. Treat all
members of one name, class, and record-kind set as one atomic record set; per-address expiry inside the
same set is not a sound traffic-weighting mechanism. Do not flush until the layer and entry have been
captured.

## Response taxonomy

Do not compress all resolver failures into "DNS failed":

| Outcome | Meaning to preserve |
| --- | --- |
| Name error | The queried name is reported not to exist in the relevant authority context. |
| No data | The name exists but no record of the requested kind is available. |
| Server failure | Processing or validation did not complete; the name may still exist. |
| Refused or policy blocked | A server or policy declined the operation. |
| Timeout or transport failure | No qualifying DNS response was observed before the client stopped. |
| Bogus validation | Data was received but failed the selected authenticity chain or policy. |
| Stale answer | Expired data was deliberately served under a resilience policy. |
| Successful wrong answer | Resolution completed but selected an unintended zone, alias, region, or address. |

Preserve response code, authoritative and recursion flags, validation and checking flags, truncation,
TTL, authority proof, extended error details, server address, transport, and retry history.

## Transport and message size

DNS support is not equivalent to allowing one small datagram. Test the contract across:

- datagram and stream transports;
- truncation followed by stream retry;
- negotiated extension payload size;
- path MTU and fragmentation behavior;
- larger DNSSEC, address, service, and alias responses;
- encrypted DNS transports used by the actual client;
- middleboxes that rewrite, drop, or synthesize replies.

Keep the server, question, and resolver path fixed while varying one transport dimension. A small
address response succeeding does not cover a larger signed response or a long alias chain.

## DNSSEC and validation

Separate answer retrieval from validation. Record:

- whether the selected resolver validates;
- trust-anchor and policy source;
- signed, unsigned, insecure, or bogus state;
- public delegation and private-zone overlap;
- negative trust policy and its exact scope;
- whether a forwarder preserves required validation data;
- clock and signature-validity assumptions;
- validation flags and extended failure reason returned to the client.

Do not disable validation globally to hide one private-zone conflict. Prove the zone and trust
boundary that requires repair or an explicitly scoped policy exception.

## CDN and resolver location

CDN answers may depend on the recursive resolver, client-subnet hints, request family, service
records, and provider policy. Record:

- client location and connection egress;
- recursive resolver location and operator;
- subnet information forwarded or suppressed;
- authoritative server and answer set;
- TTL, region, and address family;
- endpoint actually attempted by the client.

One workstation answer is not a global truth. Compare controlled resolvers and locations without
assuming that different valid answers are inconsistent. The defect may be a wrong resolver route or
unreachable selected region rather than an incorrect authoritative record.

## Alias and service records

Inspect more than address records:

- alias chain and delegation boundaries;
- provider-side alias flattening or synthesis;
- text records used for ownership or service validation;
- service-binding records that select another target, port, protocol, or address hint;
- mandatory parameters and client support;
- canonical name exposed or hidden by the provider;
- alias-target failure translated into no-data or synthesized behavior.

A flattened address answer does not prove that an alias record is visible to systems that validate
the alias itself. A browser supporting service-binding records may contact a different target or
protocol from an older command-line client.

## Container and cluster name scopes

Treat container and cluster names as scoped resolver contracts, not host-global DNS:

- loopback, hosts files, resolver files, and network namespaces belong to the container or pod that
  uses them;
- service names and aliases are visible only on owning networks and can be ambiguous when reused;
- short service names can be namespace-relative and expand through several search candidates;
- stable service names can map to changing instance addresses, so clients must detect failed
  connections, re-resolve, and reconnect under an explicit policy;
- virtual-address services and direct endpoint-set or headless services assign address selection and
  failover to different owners;
- newly created names can remain hidden behind negative caches inserted before publication;
- alias-only external-service records do not proxy traffic or rewrite HTTP and TLS authority names;
- the real path can include a virtual service address, node data plane, node-local cache, cluster
  resolver, upstream forwarder, and authoritative provider.

Capture resolver files and queries inside the failing namespace. Prove shared network membership,
namespace and search expansion, service and endpoint readiness, resolver-service reachability, cache
state, and the endpoint actually selected. A healthy resolver process or service object alone does
not prove that the failing pod reached it or received current data.

## Address selection, connection reuse, and routing

Treat name-to-address and address-to-route as adjacent contracts:

- requested and returned IPv4 and IPv6 records;
- synthesized address records and their prefix;
- existing but unusable native IPv6 records;
- VPN routes for private IPv4, IPv6, or translation prefixes;
- client address sorting, connection racing, and fallback;
- proxy address-family support;
- endpoint actually attempted and endpoint that won a race;
- reused connection, pool generation, idle and maximum lifetime, and re-resolution trigger;
- final kernel route, source address, HTTP authority, TLS server name, and peer identity.

Resolution can be correct while the chosen address is unreachable. A client with address-family
racing can mask the same broken candidate that a single-family runtime exposes.
DNS TTL expiry does not close an established transport, multiplexed session, or connection-pool entry. During failover,
separate fresh lookup from traffic still carried by older connections and prove when reconnect causes
another lookup.

## Evidence matrix

Collect complementary evidence without treating one layer as an oracle for another:

| Evidence | Proves | Does not prove |
| --- | --- | --- |
| Direct query to a named server | That server's response to that exact question. | Application, search, hosts, proxy, or cache behavior. |
| System name-service query | The selected system lookup path for that process context. | Browser or custom resolver behavior. |
| Application trace | What the application reports or requests. | The upstream packet actually sent after local caching or transformation. |
| Local stub capture | Application-to-stub traffic. | Upstream link and resolver selection. |
| Upstream capture | External DNS traffic on that interface. | Cache hits, other namespaces, or encrypted payload meaning. |
| Resolver route dump | Configured selection policy and state. | That a specific packet reached the named upstream. |
| Cache dump | Entries visible at one layer. | Entries in browser, application, proxy, or upstream caches. |
| Authoritative-server comparison | Each server's zone generation and answer at the capture time. | The recursive or application answer already cached. |
| Application connection trace | Candidate addresses, actual connection target, reuse state, and next-boundary identity. | That every returned address or future reconnect is healthy. |
| Forced endpoint with original authority identity | Behavior when DNS selection is bypassed while higher-layer identity stays intact. | That every route, address family, or resolver answer is healthy. |

Align evidence on one timeline and stable request fingerprint. Preserve privacy by redacting private
names and addresses consistently without erasing candidate relationships.

## Failure matrix

| Symptom | Resolver evidence to require |
| --- | --- |
| Direct query succeeds but application fails. | Application resolver, search expansion, local sources, secure resolver, proxy ownership, cache, and selected address. |
| Browser succeeds but runtime fails. | Separate resolver mode, service-record support, address selection, proxy, and cache identities. |
| VPN makes one suffix fail. | Link-specific route, longest-match decision, catch-all route, DNS server, and traffic route. |
| Only some long or signed names fail. | Truncation, stream retry, extension size, fragmentation, and middlebox behavior. |
| Record was fixed but old failure persists. | Negative or failure cache layer, key, insertion time, remaining lifetime, and stale policy. |
| A new name exists but remains absent. | Name-error versus no-data scope, denial proof, negative-cache owner, and publication order. |
| Old and new answers alternate. | Every authoritative server's zone generation, delegation and glue, recursive cache provenance, and resolver server-selection state. |
| Same name returns a remote region. | Recursive location, subnet hint, VPN egress, authoritative answer, and endpoint route. |
| Address records look right but browser reaches another target. | Service-binding target, port, protocol, address hints, and mandatory parameters. |
| Name resolves but connection fails. | Address-family selection, route, proxy, TLS authority identity, and endpoint reachability. |
| DNS changed but traffic stays on the old endpoint. | Runtime cache, actual selected address, connection pool generation, lifetime, reconnect, and re-resolution trigger. |
| Host lookup succeeds but a container or pod fails. | In-namespace resolver files, search expansion, local sources, network membership, cluster resolver path, and endpoint readiness. |

## Invariants

- Every DNS claim names the failing execution space and resolver path.
- Every query claim preserves actual QNAME, record kind, transport, server, time, and response class.
- Every split-DNS claim identifies the selected route and why it outranked alternatives.
- Every proxy claim identifies which side resolved the hostname.
- Every cache claim identifies one layer, key, value, age, and freshness policy before invalidation.
- Every recursive-versus-authoritative claim identifies the observation point and cache boundary.
- Every delegation claim keeps parent NS, glue, child NS, service data, and validation records separate.
- Every success claim distinguishes returned addresses, selected address, actual connection, reused
  connection, reachability, and correct service identity.
- Every comparison holds requester, name form, record kind, and resolver path constant except for the
  isolated dimension.

## Skill handoffs

- Use `name-resolution-integrity-review` for the cross-layer resolver and identity trace.
- Use `incident-triage-review` when the outage boundary is broader than name resolution.
- Use `observability-debuggability-review` when durable resolver signals, metrics, or traces change.
- Use `cache-integrity-review` when resolver cache implementation, freshness, or invalidation changes.
- Use `docker-runtime-triage` for container runtime and daemon networking after DNS localization.
- Use the matching SSRF, file-upload, or network security skill for rebinding and authorization.
- Use `config-env-change` or `structured-config-change` for proven resolver configuration edits.
