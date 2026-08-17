# docs/specs

Build specs for app features, written so Claude Code or Codex can build from
them directly without further context.

## What goes here

Technical specification only — data models, field names and types, UI
behaviour, chart definitions, unlock conditions for later phases.

## What does NOT go here

**Anything personal.** Health data, weight, measurements, medical questions,
fears, school records, finances, or anything else about Nathan as a person.

This folder is committed and pushed to `github.com/VEMJU/life-tracker`. The
project rule in `CLAUDE.md` is explicit: documents about Nathan must not be
saved into this repo, because this repo publishes.

The planning documents that these specs are derived from live outside the repo
for that reason. Each spec should be readable and buildable on its own — if a
spec needs personal context to make sense, rewrite the spec rather than
importing the context.

## Current specs

| Spec | Section | Status |
|---|---|---|
| `sleep-tracker.md` | Sleep | Phase 1 ready to build |
