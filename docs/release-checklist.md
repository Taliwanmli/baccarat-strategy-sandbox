# Release Checklist

Use this checklist before publishing a public release.

## Public Presentation

- [ ] README is polished and describes the project as an educational simulator.
- [ ] Responsible-use disclaimer is visible near the top of the README.
- [ ] Responsible-use doc is linked from the README.
- [ ] Roadmap is linked from the README.
- [ ] Contributing guide is linked from the README.
- [ ] Release notes are drafted.

## Screenshots / Demo Media

- [ ] Main app screenshot added.
- [ ] Strategy Lab screenshot added.
- [ ] Batch simulation results screenshot added.
- [ ] Short GIF or video showing a simulation run added.
- [ ] README links to real screenshot/demo files only after they exist.

## Build And Test

- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] Desktop builds tested on target platforms where feasible.
- [ ] macOS release asset generated if available.
- [ ] Windows release asset generated if available.

## Safety And Repository Hygiene

- [ ] No secrets or private files committed.
- [ ] No casino credentials or integrations.
- [ ] No betting-service credentials or integrations.
- [ ] No real-money betting workflow.
- [ ] No claims that Martingale or any strategy can beat baccarat.
- [ ] No generated artifacts committed unless intentionally part of a release.

## GitHub Release

- [ ] Release title reviewed.
- [ ] Release notes pasted into GitHub release.
- [ ] Release assets uploaded if available.
- [ ] Checks pass for the tagged release workflow.
- [ ] GitHub topics added manually.

## Suggested GitHub Topics

These topics match the current repository scope and stack:

- `baccarat`
- `martingale`
- `simulation`
- `probability`
- `risk-analysis`
- `educational-tool`
- `strategy-simulator`
- `typescript`
- `react`
- `vite`
- `electron`
- `gambling-risk`
- `bankroll-management`

## Release Notes Draft

Suggested title:

`v0.1 Educational Simulator Snapshot`

Suggested summary:

Initial public educational snapshot of Baccarat Strategy Sandbox, an offline simulator for studying Martingale-style betting risk with pretend money. Includes manual baccarat dealing, Strategy Lab simulations, batch session analysis, bankroll/unit controls, and responsible-use documentation. This release is for education, probability visualization, and source-code study only; it is not gambling advice, financial advice, or a real-money betting tool.
