# Baccarat Strategy Sandbox

Offline baccarat simulator and strategy lab for studying Martingale-style betting risk. The app runs locally, uses pretend money only, and does not connect to any casino or betting service.

## Use The App

Desktop downloads are published on the repository's **Releases** page when a release is available.

Available release files may include:

- macOS: `.dmg` or `.zip`
- Windows: `.exe` installer or portable `.exe`

If no release is available yet, the app can still be run from source with Node.js:

```bash
npm install
npm run dev
```

Then open the local URL printed in the terminal.

## How To Use

1. Open the app.
2. Choose shoe settings such as deck count and optional random seed.
3. Deal hands manually, or use **Strategy Lab** to run simulations.
4. Hover over the small information icons in the app to see short explanations for settings and results.
5. Compare single-session results with multi-session batch results to see how bankroll, unit size, and losing streaks affect risk.

## Strategy Lab

The Strategy Lab runs local simulations for visual study. It can show why a Martingale can appear profitable in some short sessions while still failing under enough variance, finite bankroll limits, and stake growth.

Built-in presets:

- **Player after Banker Martingale**: waits for a resolved Banker result followed by a resolved Player result (`B -> P`), then bets Player on the next hand. A Player loss doubles the next required stake, but betting pauses until another `B -> P` signal appears. A Player win resets the next stake to the unit bet. Ties push and do not update the resolved Player/Banker signal history.
- **Flat Bet Player**: bets Player every hand using the unit bet. It does not double after losses. This is included as a baseline comparison against Martingale behavior.

Run modes:

- **Run Chart Hands**: deals baccarat hands only for road-chart visualization.
- **Run Strategy Session**: runs one strategy session until the target number of bets is placed, the profit target is reached, or the bankroll cannot afford the next required bet.
- **Run Strategy Sessions**: runs many independent sessions and reports how many ended profitable, how many hit the target, the average result, best/worst result, and bust count.

## Why Martingale Still Fails

Martingale does not change baccarat probabilities. Player bets are still negative expectation after the rules and tie behavior are considered, and Banker is also negative expectation after commission. Doubling can make many small sessions end in profit, but the losing ladder grows exponentially:

```text
5, 10, 20, 40, 80, 160, 320, ...
```

With a finite bankroll, a long enough losing or interrupted recovery sequence eventually becomes unaffordable. If a real table has maximum bets, that limit creates the same problem. Editing bankroll, unit size, target profit, or session count can change how often failure appears, but it does not remove the underlying negative expectation or tail risk.

This project is for education, visualization, and source-code study. It is not financial advice and should not be used to automate gambling.

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

Requirements:

- Node.js 22 or newer
- npm

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

## License

MIT. See [LICENSE](LICENSE).
