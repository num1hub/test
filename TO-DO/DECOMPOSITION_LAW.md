<!-- @anchor doc:todo.decomposition-law links=doc:todo.index,doc:todo.hot-queue,doc:todo.execution-protocol,doc:todo.task-template,doc:todo.agent-operating-modes,doc:n1hub.context,doc:n1hub.agents note="Decomposition law for keeping N1Hub hot tasks bounded, machine-actionable, and safe for AI-agent execution." -->
# N1Hub TO-DO Decomposition Law

Updated: 2026-03-09

This file defines how hot work should be split before it reaches an executor lane. The goal is simple: each task should be small enough to execute honestly, large enough to matter, and explicit enough that the next agent does not need to rediscover the boundary from chat.

## Core Rule

One hot task should usually represent one bounded outcome across one primary public boundary.

Good hot tasks:

- produce one audit
- force one decision set
- change one contract surface
- add one focused test net
- define one bounded control-plane slice

Bad hot tasks:

- “clean up the whole subsystem”
- “make A2C smarter”
- “refactor N1 completely”
- “finish Real/Dream”

## Task Classes

Use one dominant class per task packet:

- `Audit`
  Measure current repo truth and freeze it into one trusted artifact.
- `Decision`
  Force explicit classification or branch policy on a bounded set.
- `Implementation`
  Change one runtime or doc contract along one named seam.
- `Test Net`
  Add proof around one unstable or high-risk path.
- `Control Plane`
  Define or implement one coordination surface between existing systems.
- `Migration`
  Move one bounded surface from old form to new form with reversibility.

If a task tries to be two or three classes at once, split it.

## Granularity Rule

A task packet is correctly sized only if all of the following are true:

1. one agent lane can own it without constant arbitration
2. one report can explain what changed and what remains
3. one verification block can prove the current step honestly
4. one handoff note can tell the next agent exactly where to continue

When any of those fail, the task is too broad.

## Dependency Language

Use these dependency meanings consistently:

- `Hard dependency`
  The task should not start until another named task or artifact is complete.
- `Soft dependency`
  The task can start, but should prefer the latest output from another task first.
- `Output dependency`
  The task is mainly waiting for one report, packet, or classification artifact.

If a dependency exists, name the exact task or artifact. Do not write vague blockers like “needs more context.”

## Split Triggers

Split a task into follow-up packets when:

- the remaining work belongs to another owner lane
- the remaining work crosses into another cluster
- a triage pass reveals multiple independent rewrite paths
- the verification block starts testing unrelated behaviors
- the handoff note becomes longer than the implementation plan

Do not split work just to create motion. Split when boundary clarity improves.

## Handoff Minimum

Every serious hot packet should leave enough structure for the next lane to continue without guesswork:

- current status
- what is already proven
- what still needs proof
- exact blocker or exact next step
- exact artifact or file path where the next agent should look first

If the packet cannot provide that, it is not ready to leave the current pass.

## Queue Fitness Test

Before promoting a task into `READY`, confirm:

- the goal names one outcome
- the scope names real files or surfaces
- the non-goals actually fence the blast radius
- the dependencies are explicit
- the verification block matches the class of work
- the queue update rule tells the next agent what to do if the pass is partial

## Class-Specific Done Bars

- `Audit`
  Done when the measured artifact exists, the counts or facts reproduce, and the next tasks are clearer.
- `Decision`
  Done when each named subject has an explicit classification and unresolved cases are split.
- `Implementation`
  Done when the contract changed, tests passed, and residual risk is explicit.
- `Test Net`
  Done when the targeted path is protected and the suite stays bounded.
- `Control Plane`
  Done when the routing or coordination model is explicit enough for implementation slices to start.
- `Migration`
  Done when the old path and new path are both legible enough to cut over safely.

## Rule

Do not let a hot packet become an ambition container. If the task is too important to stay bounded, it is too important to leave unsplit.
