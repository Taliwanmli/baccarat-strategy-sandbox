# Baccarat Strategy Sandbox

Offline baccarat simulator and strategy lab for studying Martingale-style betting risk. The app runs locally, uses pretend money only, and does not connect to any casino or betting service.

## Download For Non-Technical Users

Use GitHub Releases after this project is pushed to GitHub:

1. Create a tag such as `v0.1.0` and push it.
2. GitHub Actions builds macOS and Windows desktop packages.
3. Users open the repository's **Releases** page, download the file for their computer, and launch the app.

Expected release files:

- macOS: `.dmg` or `.zip`
- Windows: `.exe` installer or portable `.exe`

The desktop app is an Electron wrapper around the local simulator. It is intended for people who do not want to install Node.js or run terminal commands.

### Signing Note

The included workflow builds unsigned desktop packages by default. Unsigned open-source apps can trigger macOS Gatekeeper or Windows SmartScreen warnings. For a smoother public release, add Apple Developer ID and Windows code-signing certificates to the repository secrets and extend the Electron Builder signing configuration.

## Strategy Lab

The Strategy Lab is for visual study of individual baccarat sessions and many repeated sessions. It helps show how a Martingale can appear profitable in some short sessions while still failing under enough variance, finite bankroll limits, and table-limit-like stake growth.

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

## Rules Implemented

- Standard Punto Banco baccarat.
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

## Local Development

Requirements:

- Node.js 22 or newer
- npm

Install dependencies:

```bash
npm install
```

Run the browser development server:

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

Build desktop packages locally:

```bash
npm run desktop:mac
npm run desktop:win
```

macOS packages should be built on macOS. Windows packages should be built on Windows. The GitHub Actions workflow handles both platforms automatically.

## Publishing A Release

After pushing the repository to GitHub:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow will run tests, build the web app, package desktop apps for macOS and Windows, and attach the generated files to the GitHub Release.

## License

MIT. See [LICENSE](LICENSE).
