// Aggregate each command/lock before pairing commands, avoiding an effect-row cross product.
export function commandLockConflictQuery(placeholders: string): string {
	return `
WITH grouped AS (
  SELECT intent, lock,
    group_concat(DISTINCT path) AS paths,
    group_concat(DISTINCT mode) AS modes,
    group_concat(DISTINCT concurrency) AS concurrencies,
    max(restrictive) AS restrictive,
    group_concat(DISTINCT CASE WHEN restrictive THEN path END) AS restricted_paths,
    group_concat(DISTINCT CASE WHEN restrictive THEN mode END) AS restricted_modes,
    group_concat(DISTINCT CASE WHEN restrictive THEN concurrency END) AS restricted_concurrencies
  FROM (
    SELECT *, (access = 'write' OR concurrency = 'exclusive' OR mode = 'delete_recreate') AS restrictive
    FROM command_effects
    WHERE lock IN (SELECT lock FROM command_effects WHERE intent IN (${placeholders}))
  )
  GROUP BY intent, lock
)
SELECT a.intent AS left_intent, b.intent AS right_intent, a.lock AS lock,
  CASE WHEN b.restrictive THEN a.paths ELSE a.restricted_paths END AS left_paths,
  CASE WHEN a.restrictive THEN b.paths ELSE b.restricted_paths END AS right_paths,
  CASE WHEN b.restrictive THEN a.modes ELSE a.restricted_modes END AS left_modes,
  CASE WHEN a.restrictive THEN b.modes ELSE b.restricted_modes END AS right_modes,
  CASE WHEN b.restrictive THEN a.concurrencies ELSE a.restricted_concurrencies END AS left_concurrencies,
  CASE WHEN a.restrictive THEN b.concurrencies ELSE b.restricted_concurrencies END AS right_concurrencies
FROM grouped a JOIN grouped b ON a.lock = b.lock AND a.intent < b.intent
WHERE (a.restrictive OR b.restrictive)
  AND (a.intent IN (${placeholders}) OR b.intent IN (${placeholders}))
ORDER BY lock, left_intent, right_intent
`;
}
