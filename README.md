# Baccarat Strategy Sandbox

**Offline baccarat simulator and strategy lab for visualizing Martingale-style betting risk.**

Baccarat Strategy Sandbox is an offline educational simulator for exploring how baccarat outcomes, bankroll size, unit size, and Martingale-style stake progression interact. It uses pretend money only and does not connect to casinos or betting services. The goal is to show why betting systems can look ahead in short sessions while still failing under variance, finite bankroll, table limits, and negative expected value.

> **Educational simulation only. No real money, no casino connection, no betting automation, no gambling advice.**

## Screenshots / Demo GIF Coming Soon

Planned public release media:

- Main app screenshot
- Strategy Lab screenshot
- Batch simulation results screenshot
- Short GIF or video showing a simulation run

Tracking item: [docs/release-checklist.md](docs/release-checklist.md)

## What This Project Demonstrates

- Probability and risk simulation using controlled, local baccarat hand generation.
- Bankroll and unit-size experimentation with pretend balances.
- Martingale-style strategy analysis, including stake growth, losing ladders, and bust conditions.
- Single-session versus many-session comparisons for showing variance and tail risk.
- Local-first educational tool design with no account system, casino connection, or external betting service.
- A TypeScript, React, Vite, and Electron application structure suitable for source-code study and desktop packaging.
- Clear responsible-use framing for a simulation topic that can otherwise be confused with gambling advice.
- Lightweight release and documentation polish suitable for explaining an AI-assisted software engineering workflow in a portfolio context.

## What You Can Test

- Manual baccarat dealing with configurable 6-deck or 8-deck shoes.
- Optional random seeds for repeatable simulated shoe sequences.
- Player and Banker manual bets using a pretend bankroll.
- Road-chart visualization for manual hands or Strategy Lab output.
- Strategy Lab single-session runs using preset strategies.
- Batch simulation runs that summarize many independent sessions.
- How bankroll, unit bet, target bets, optional profit target, and session count change the shape of simulated outcomes.

## Example Questions You Can Explore

- How often does a Martingale-style strategy finish short sessions ahead in the simulation?
- What happens when the bankroll cannot cover the next doubled bet?
- How does unit size affect bust risk?
- How do single-session results differ from many-session batch results?
- Why can a betting system feel reliable while still having negative expected value?
- How quickly can a stake ladder grow after several losses?

## Quick Start

Requirements:

- Node.js 22 or newer
- npm

Run from source:

```bash
npm install
npm run dev
```

Then open the local URL printed in the terminal.

Run checks:

```bash
npm test
npm run build
```

## Desktop Releases

Desktop downloads are published on the repository's [Releases](https://github.com/Taliwanmli/baccarat-strategy-sandbox/releases) page when a release is available. Release files may include:

- macOS: `.dmg` or `.zip`
- Windows: `.exe` installer or portable `.exe`

The repository includes a GitHub Actions workflow for tagged desktop releases. See:

- [docs/release-checklist.md](docs/release-checklist.md)
- [docs/release-notes-v0.1.md](docs/release-notes-v0.1.md)

## Responsible Use

This project is for education, probability visualization, bankroll/tail-risk experimentation, source-code study, and portfolio demonstration. It is not gambling advice, financial advice, a real-money betting tool, or casino automation.

Read the full responsible-use statement: [docs/responsible-use.md](docs/responsible-use.md)

## Strategy Lab

The Strategy Lab runs local simulations for visual study. It can show why a Martingale-style progression can appear ahead in some short sessions while still failing under enough variance, finite bankroll limits, and stake growth.

Built-in presets:

- **Player after Banker Martingale**: waits for a resolved Banker result followed by a resolved Player result (`B -> P`), then bets Player on the next hand. A Player loss doubles the next required stake, but betting pauses until another `B -> P` signal appears. A Player win resets the next stake to the unit bet. Ties push and do not update the resolved Player/Banker signal history.
- **Flat Bet Player**: bets Player every hand using the unit bet. It does not double after losses. This is included as a baseline comparison against Martingale-style behavior.

Run modes:

- **Run Chart Hands**: deals baccarat hands only for road-chart visualization.
- **Run Strategy Session**: runs one strategy session until the target number of bets is placed, the profit target is reached, or the bankroll cannot afford the next required bet.
- **Run Strategy Sessions**: runs many independent sessions and reports simulated sessions ahead, target hits, average result, best/worst result, and bust count.

## Why Martingale Still Fails

Martingale does not change baccarat probabilities. Player and Banker bets remain negative expectation after baccarat rules, tie behavior, and Banker commission are considered.

Doubling creates many small simulated wins but rare large losses. The losing ladder grows exponentially:

```text
5, 10, 20, 40, 80, 160, 320, ...
```

The recovery assumption breaks when bankroll is finite. A long enough losing or interrupted recovery sequence eventually becomes unaffordable. Table maximums create the same failure point by preventing the next required doubled stake.

Changing bankroll, unit size, target profit, or session count can change how often failure appears in the simulator, but it does not remove negative expectation or tail risk. Simulation results should not be interpreted as a profitable betting method.

## Baccarat Rules Implemented

- Standard baccarat drawing rules.
- 6-deck and 8-deck shoes.
- Aces count as 1, cards 2-9 count as face value, and 10/J/Q/K count as 0.
- Hand totals are modulo 10.
- Naturals of 8 or 9 stop all third-card drawing.
- Player draws on 0-5 and stands on 6-7.
- Banker follows the standard third-card tableau.
- Player wins pay 1:1.
- Banker wins pay 0.95:1.
- Player and Banker bets push on ties.
- The shoe reshuffles when remaining cards are below the configured threshold.

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build the web app:

```bash
npm run build
```

Build desktop packages:

```bash
npm run desktop:mac
npm run desktop:win
```

Desktop builds use Electron. macOS packages should be built on macOS, and Windows packages should be built on Windows.

## Project Docs

- [Responsible use](docs/responsible-use.md)
- [Roadmap](ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Release checklist](docs/release-checklist.md)
- [v0.1 release notes draft](docs/release-notes-v0.1.md)

## License

MIT. See [LICENSE](LICENSE).
