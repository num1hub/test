---
name: linear-graphql
description: Use the Linear GraphQL bridge for tracker reads and mutations only when the active runtime actually provides it.
---

# Linear GraphQL

This skill is runtime-conditional. It only applies when the current Symphony session exposes `linear_graphql`.

## When To Use It

- Reading or updating Linear from inside a Symphony issue run.
- Fetching tracker details without pushing raw API keys into prompts or shell history.

## Rules

- Keep each call to a single GraphQL operation.
- Prefer the smallest query or mutation that solves the task.
- If the runtime does not provide `linear_graphql`, do not assume it exists.
