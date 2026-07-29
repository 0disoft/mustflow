---
mustflow_doc: skill.information-visualization-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: information-visualization-integrity-review
description: Apply this skill when charts, graphs, tables, diagrams, flowcharts, timelines, dashboards, infographics, data stories, or text-to-visual summaries are selected, specified, created, reviewed, or reported and the visual form must match the reader decision, semantic relationship, exact-value need, uncertainty, failure path, abstraction level, accessibility, or source evidence instead of merely looking plausible.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.information-visualization-integrity-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Information Visualization Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Choose and verify visual forms from the decision a reader must make, then preserve values, scope,
uncertainty, exceptions, sequence, and causal meaning through specification and rendering.

Treat a visualization as an evidence-bearing interface. A polished chart or diagram fails when it
invents continuity, hides denominators, merges incompatible flows, or makes the reader reconstruct
the claim by bouncing between legends, notes, and unrelated panels.

<!-- mustflow-section: use-when -->
## Use When

- A chart, graph, table, dashboard, infographic, flowchart, sequence diagram, dependency graph,
  architecture diagram, state diagram, organization chart, or timeline is planned or reviewed.
- Long prose, incident history, architecture notes, research findings, or process documentation
  must become a visual explanation without losing conditions or exceptions.
- An AI system chooses visualization types, generates chart specifications, summarizes source text
  visually, or validates rendered output.
- A report claims that a visual is accurate, accessible, uncluttered, decision-ready, or faithful
  to its source.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only needs a safe static HTML review container; use visual-review-artifact.
- The visual form is already correct and the task is only hostile-content, responsive, zoom, or
  container resilience; use frontend-stress-layout-review.
- The task is only browser semantics, keyboard, focus, accessible names, or accessibility-tree
  behavior; use frontend-accessibility-tree-review.
- The task is only statistical analysis validity with no visual representation decision. Apply the
  owning analytics or domain procedure first.
- A short sentence or compact list communicates the result more clearly than a visual.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Reader, decision, question, action, and the one-sentence conclusion the visual should support.
- Source text or data, provenance, dimensions, measures, units, aggregation, denominator, sample
  size, time basis, missing values, exclusions, and uncertainty.
- Semantic relationship: exact lookup, comparison, rank, trend, distribution, composition,
  correlation, hierarchy, process, state transition, dependency, sequence, timeline, or location.
- Claim ledger: every conclusion the visual asserts and the source condition that can verify it.
- Visual specification: chosen form, encoding, sort, scale, axis, labels, annotations, color
  meaning, missing-data treatment, uncertainty treatment, and alternative text or table.
- Delivery context: screen, document, slide, dashboard, export, responsive constraints, and
  configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The source can support the intended claim, or the missing evidence is explicitly identified.
- The reader question and semantic relationship are fixed before a renderer or chart library is
  selected.
- Current project patterns and configured verification intents have been inspected.
- If data correctness, statistical inference, accessibility, layout stress, or domain policy owns
  a narrower risk, that procedure remains authoritative for its boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or revise visualization specifications, chart or table configuration, diagrams, timelines,
  direct labels, annotations, accessible summaries, source tables, fixtures, tests, and directly
  synchronized docs.
- Split one overloaded visual into an overview plus detail or several single-purpose views.
- Replace a misleading chart with a table, text, or no visual.
- Do not invent missing values, smooth gaps, infer causality from order, fabricate precision,
  replace source evidence with generated pixels, or hide scope and exceptions in unreadable notes.
- Do not start browsers, renderers, servers, or external visualization tools unless the selected
  repository command contract authorizes them.

<!-- mustflow-section: procedure -->
## Procedure

1. Write the reader contract.
   - State the reader question, decision, next action, and expected one-sentence takeaway.
   - If several decisions compete, split the visual before choosing a chart type.
2. Classify the semantic relationship.
   - Use a table for exact lookup or mixed text and numeric attributes.
   - Use bars or dots for discrete comparison and rank.
   - Use a line only for ordered continuous domains where intermediate values have meaning.
   - Use histograms or box plots for distribution, stacked bars for composition, scatter plots for
     relationship, and maps only when location changes the conclusion.
   - Combine a graph with a source table or in-cell bars and sparklines when both pattern and exact
     values matter.
3. Choose the diagram family by meaning, not by the presence of boxes and arrows.
   - Use architecture views for composition, sequence diagrams for ordered calls, state diagrams
     for allowed transitions, dependency graphs for propagation, flowcharts for decisions and
     process movement, organization trees for hierarchy, and timelines for temporal change.
   - Separate business action, data movement, state change, and service calls into distinct views
     or visibly separated lanes.
4. Translate prose structurally.
   - Extract claims, evidence, conditions, exceptions, actors, objects, actions, and transitions.
   - Map nouns to nodes and verbs to labeled edges only when the source supports that relation.
   - Compress repeated examples into a shared rule while preserving examples that change the
     conclusion.
   - Reorder by importance and relationship rather than copying paragraph order into cards.
5. Define the visual specification before rendering.
   - Record source fields, dimensions, measures, units, aggregation, sorting, missing-value policy,
     scale, axis range, label survival priority, color meaning, annotations, and claim ids.
   - Refuse rendering when units, aggregation, denominators, incompatible measures, or source
     conflicts remain unresolved.
6. Apply rejection rules before recommendation rules.
   - Reject pie charts for many categories, lines across unordered categories, dual axes that can
     manufacture correlation, area-scaled symbols without area-safe encoding, maps without spatial
     meaning, distribution plots with inadequate samples, and Sankey diagrams without conserved
     flow.
   - Treat a table, highlighted number, short summary, or no visual as valid fallbacks.
7. Preserve truth conditions.
   - Keep measured and forecast values visually distinct.
   - Show missing intervals as gaps, not zero; show denominator and sample size with rates.
   - Separate cumulative totals from period increments and averages from tails or distributions.
   - Mark changed measurement definitions, excluded data, uncertain dates, ranges, and hypotheses.
   - Break or separate a series at a measurement-definition change unless a documented restatement
     makes both sides comparable. Do not label a cross-definition jump as performance movement.
   - Keep comparable small multiples on the same scale or label and justify every scale difference.
   - Do not draw causal edges from temporal order alone.
8. Make process and dependency diagrams operationally honest.
   - Label edges with actions such as request, response, event, copy, approval, rollback, or retry.
   - Include cancellation, timeout, duplicate, partial failure, recovery, compensation, and unknown
     outcomes where they are reachable.
   - Write decisions as answerable questions and close every realistic exit.
   - Show cycles with retry budget, deadline, termination condition, and idempotency identity.
   - Give distinct effects distinct retry loops and attempt identities. Do not let event
     republication imply provider re-execution or share an ambiguous attempt counter.
   - Keep one abstraction level per view and link nodes to stable service, API, event, table, or
     source identifiers when available.
9. Make timelines honest.
   - Declare the time basis and separate occurrence, detection, decision, communication, and user
     impact when they differ.
   - Distinguish events from durations, preserve meaningful idle gaps, represent uncertain dates as
     ranges, and emphasize turning points rather than every recorded event.
10. Control reading density.
    - Give one visual the lead role per screen or slide.
    - Put explanations and direct labels beside the marks they explain; use legends only when direct
      labeling fails.
    - Use spacing as a semantic boundary and progressive detail rather than equal-weight card grids.
    - Remove repeated title, body, legend, and axis wording.
11. Preserve accessibility without delegating meaning to color or hover.
    - Pair color with labels, shapes, patterns, icons, or line styles; use ordered luminance for
      ordered values and diverging scales only around a meaningful reference.
    - Name units, aggregation, truncated or logarithmic axes, and non-text contrast requirements.
    - Provide a concise conclusion and source table or structured long description for complex
      visuals. Tooltips must not be the only evidence path.
    - Hand rendered DOM, keyboard, focus, and assistive-technology checks to
      frontend-accessibility-tree-review.
12. Build the claim ledger and oracle.
    - Convert claims such as maximum, decline, rank, total, and co-movement into checks against the
      source table rather than asking the generated visual to validate itself.
    - Compare displayed values, totals, sort order, direction, labels, units, gaps, and annotations
      with independent source evidence.
13. Stress the result.
    - Test empty, single-point, all-zero, negative, null, long-label, many-category, large-number,
      mixed-locale, RTL, 200 percent zoom, narrow-container, and changed-measurement fixtures where
      relevant.
    - Hand responsive geometry and hostile-content failures to frontend-stress-layout-review.
14. Run a reconstruction test.
    - Give the visual without oral explanation to an independent reader or evaluator.
    - Ask for the main claim, evidence, scope, condition, exception, direction, and uncertainty.
    - Treat invented causality, lost exceptions, wrong values, or an unrecoverable conclusion as a
      failed visual contract, not a taste disagreement.
15. Report evidence level.
    - Separate source-data checks, specification checks, rendered-output checks, accessibility
      checks, human reconstruction evidence, and missing evidence.

<!-- mustflow-section: postconditions -->
## Postconditions

- The visual form follows the reader decision and semantic relationship.
- Exact values, patterns, scope, denominator, uncertainty, missingness, conditions, exceptions,
  sequence, and causality are preserved or explicitly marked unavailable.
- Claims map to independent source evidence and do not rely on self-validation by the rendered
  visual.
- Layout and accessibility handoffs are applied or reported when those risks are present.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- changes_status
- changes_diff_summary
- lint
- build
- test_related
- test
- docs_validate_fast
- test_release
- mustflow_check

Prefer the narrowest configured data, chart, diagram, component, accessibility, layout, export,
docs, or package check. Do not claim visual, browser, screen-reader, statistical, or human
reconstruction proof when only static source inspection was performed.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the reader decision is unclear, preserve the source and return a table or bounded question
  instead of guessing a chart.
- If units, denominators, aggregation, provenance, or source values conflict, stop rendering and
  report the unresolved specification fields.
- If several relationships need one overloaded visual, split the views and keep a shared source
  table or navigation path.
- If a rendered result cannot be checked with configured tools, report static specification
  evidence and the missing runtime or human reconstruction evidence separately.
- If a visual conflicts with accessibility or hostile-content constraints, preserve meaning first,
  simplify the encoding, and use the matching specialist skill before adding decoration.

<!-- mustflow-section: output-format -->
## Output Format

- Reader decision and one-sentence claim
- Source, provenance, units, aggregation, denominator, sample, missingness, and uncertainty
- Semantic relationship and selected or rejected visual forms
- Visual specification and claim ledger
- Diagram flow, failure-path, abstraction, cycle, or timeline checks where relevant
- Density, direct-label, color, accessibility, and fallback decisions
- Source-data, specification, rendered, reconstruction, and accessibility evidence levels
- Command intents run
- Skipped checks and reasons
- Remaining visualization-integrity risk
