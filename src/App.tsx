import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, Shuffle, FlaskConical, PauseCircle, Info } from "lucide-react";
import { BaccaratHand, BetSide, Outcome, resolveMainBet } from "./domain/baccarat";
import { formatCards } from "./domain/cards";
import { HandHistoryRow } from "./domain/history";
import { buildBeadPlate, buildBigRoad } from "./domain/road";
import { emptyStats, addOutcome, OutcomeStats, SessionResult, StrategyBatchSummary } from "./domain/simulation";
import { BaccaratShoe, defaultShoeSettings, ShoeSettings } from "./domain/shoe";
import {
  applyStrategyHand,
  createStrategyState,
  decidePlayerAfterBankerMartingale,
  defaultStrategySettings,
  makeProgression,
  StrategySettings,
  StrategyState,
} from "./domain/strategy";
import { dealBaccaratHand } from "./domain/baccarat";

const quickBets = [5, 10, 20, 40, 80, 160, 320];

function gbp(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(value);
}

function pct(part: number, total: number): string {
  return total ? `${((part / total) * 100).toFixed(2)}%` : "0.00%";
}

function numericInput(value: string, min: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, parsed) : min;
}

function HelpTip({ text }: { text: string }) {
  return (
    <span className="help-tip" tabIndex={0} aria-label={text}>
      <Info size={14} aria-hidden="true" />
      <span className="help-bubble">{text}</span>
    </span>
  );
}

function FieldCaption({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="field-caption">
      {label}
      <HelpTip text={tip} />
    </span>
  );
}

export function App() {
  const [shoeSettings, setShoeSettings] = useState<ShoeSettings>(defaultShoeSettings);
  const shoeRef = useRef(new BaccaratShoe(defaultShoeSettings));
  const [shoeVersion, setShoeVersion] = useState(0);

  const [startingBankroll, setStartingBankroll] = useState(500);
  const [bankroll, setBankroll] = useState(500);
  const [baseUnit, setBaseUnit] = useState(5);
  const [stake, setStake] = useState(5);
  const [betSide, setBetSide] = useState<BetSide>("Player");
  const [lastHand, setLastHand] = useState<BaccaratHand | undefined>();
  const [history, setHistory] = useState<HandHistoryRow[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [stats, setStats] = useState<OutcomeStats>(emptyStats());
  const [strategySettings, setStrategySettings] = useState<StrategySettings>(defaultStrategySettings);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [overlayState, setOverlayState] = useState<StrategyState>(() => createStrategyState(defaultStrategySettings));

  const [labResult, setLabResult] = useState<SessionResult | undefined>();
  const [batchSummary, setBatchSummary] = useState<StrategyBatchSummary | undefined>();
  const [workerStatus, setWorkerStatus] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const workerRef = useRef<Worker | undefined>(undefined);
  const [chartSource, setChartSource] = useState<"manual" | "lab">("manual");

  const chartOutcomes = chartSource === "lab" && labResult ? labResult.outcomes : outcomes;

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  function refreshShoe(settings: ShoeSettings) {
    shoeRef.current.updateSettings(settings);
    setShoeVersion((value) => value + 1);
  }

  function updateShoe<K extends keyof ShoeSettings>(key: K, value: ShoeSettings[K]) {
    const next = { ...shoeSettings, [key]: value };
    setShoeSettings(next);
    refreshShoe(next);
  }

  function resetSession() {
    refreshShoe(shoeSettings);
    setBankroll(startingBankroll);
    setLastHand(undefined);
    setHistory([]);
    setOutcomes([]);
    setStats(emptyStats());
    setOverlayState(createStrategyState(strategySettings));
    setChartSource("manual");
  }

  function newShoe() {
    shoeRef.current.newShoe();
    setShoeVersion((value) => value + 1);
  }

  function dealManualHand() {
    const hand = dealBaccaratHand(shoeRef.current);
    const resolved = resolveMainBet(betSide, stake, hand.outcome);
    const nextBankroll = bankroll + resolved.profit;
    const nextStats = { ...stats };
    addOutcome(nextStats, hand.outcome);

    const decision = decidePlayerAfterBankerMartingale(overlayState, strategySettings);
    const overlay = overlayEnabled ? applyStrategyHand(overlayState, strategySettings, decision, hand) : undefined;

    const row: HandHistoryRow = {
      id: history.length + 1,
      shoeNumber: hand.shoeNumber,
      playerCards: formatCards(hand.playerCards),
      playerTotal: hand.playerTotal,
      bankerCards: formatCards(hand.bankerCards),
      bankerTotal: hand.bankerTotal,
      outcome: hand.outcome,
      manualBetSide: betSide,
      stake,
      profit: resolved.profit,
      bankrollAfter: nextBankroll,
      strategy: overlay,
    };

    setLastHand(hand);
    setBankroll(nextBankroll);
    setStats(nextStats);
    setOutcomes((items) => [...items, hand.outcome]);
    setHistory((items) => [row, ...items].slice(0, 500));
    setShoeVersion((value) => value + 1);
  }

  function runWorker(type: "runChart" | "runStrategy" | "runStrategyBatch") {
    workerRef.current?.terminate();
    setWorkerStatus("Running...");
    setIsRunning(true);
    if (type !== "runStrategyBatch") setBatchSummary(undefined);
    const worker = new Worker(new URL("./workers/simulationWorker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    const finishWorker = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = undefined;
      setIsRunning(false);
    };
    worker.onmessage = (event) => {
      const message = event.data;
      if (message.type === "batchProgress") {
        setWorkerStatus(`Running... ${message.completed.toLocaleString()} sessions`);
      }
      if (message.type === "chartComplete" || message.type === "strategyComplete") {
        setLabResult(message.result);
        setChartSource("lab");
        setWorkerStatus(`Complete: ${message.result.stopReason ?? "finished"}`);
        finishWorker();
      }
      if (message.type === "batchComplete") {
        setBatchSummary(message.summary);
        setWorkerStatus("Batch complete");
        finishWorker();
      }
      if (message.type === "error") {
        setWorkerStatus(message.message);
        finishWorker();
      }
    };
    worker.onerror = () => {
      setWorkerStatus("Simulation worker failed");
      finishWorker();
    };
    if (type === "runChart") worker.postMessage({ type, shoeSettings, hands: strategySettings.chartHands });
    if (type === "runStrategy") worker.postMessage({ type, shoeSettings, strategySettings });
    if (type === "runStrategyBatch") {
      worker.postMessage({ type, shoeSettings, strategySettings, sessions: strategySettings.sessionRuns });
    }
  }

  const progression = useMemo(
    () => makeProgression(strategySettings.baseUnit, 8),
    [strategySettings.baseUnit],
  );

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>Baccarat Strategy Sandbox</h1>
          <p>Local offline baccarat simulator for strategy testing.</p>
        </div>
        <div className="shoe-pill">
          Shoe {shoeRef.current.shoeNumber} · {shoeRef.current.remainingCards} cards
          <span className="hidden-counter">{shoeVersion}</span>
        </div>
      </header>

      <section className="table-zone">
        <ShoePanel settings={shoeSettings} onChange={updateShoe} onNewShoe={newShoe} />
        <div className="felt">
          <HandArea title="Player" tone="player" hand={lastHand} cards={lastHand?.playerCards ?? []} total={lastHand?.playerTotal} />
          <div className="result-orb">
            <span>{lastHand?.outcome ?? "-"}</span>
            <small>{lastHand?.natural ? "Natural" : lastHand ? "Resolved" : "Ready"}</small>
          </div>
          <HandArea title="Banker" tone="banker" hand={lastHand} cards={lastHand?.bankerCards ?? []} total={lastHand?.bankerTotal} />
        </div>
        <ManualPanel
          startingBankroll={startingBankroll}
          setStartingBankroll={setStartingBankroll}
          bankroll={bankroll}
          baseUnit={baseUnit}
          setBaseUnit={setBaseUnit}
          stake={stake}
          setStake={setStake}
          betSide={betSide}
          setBetSide={setBetSide}
          onDeal={dealManualHand}
          onReset={resetSession}
        />
      </section>

      <section className="grid-two">
        <RoadCharts outcomes={chartOutcomes} source={chartSource} setSource={setChartSource} hasLab={Boolean(labResult)} />
        <StatsPanel stats={chartSource === "lab" && labResult ? labResult.stats : stats} />
      </section>

      <StrategyLab
        settings={strategySettings}
        setSettings={(next) => {
          setStrategySettings(next);
          setOverlayState(createStrategyState(next));
        }}
        progression={progression}
        onRun={runWorker}
        status={workerStatus}
        result={labResult}
        batchSummary={batchSummary}
        overlayEnabled={overlayEnabled}
        setOverlayEnabled={setOverlayEnabled}
        isRunning={isRunning}
      />

      <HistoryTable rows={chartSource === "lab" && labResult ? labResult.history : history} />
    </main>
  );
}

function ShoePanel({
  settings,
  onChange,
  onNewShoe,
}: {
  settings: ShoeSettings;
  onChange: <K extends keyof ShoeSettings>(key: K, value: ShoeSettings[K]) => void;
  onNewShoe: () => void;
}) {
  return (
    <div className="panel compact-panel">
      <label>
        <FieldCaption label="Decks" tip="Number of standard decks in the simulated shoe. Most casino baccarat tables use 6 or 8 decks." />
        <select value={settings.decks} onChange={(event) => onChange("decks", Number(event.target.value) as 6 | 8)}>
          <option value={8}>8 decks</option>
          <option value={6}>6 decks</option>
        </select>
      </label>
      <label>
        <FieldCaption label="Cut card threshold" tip="When the shoe has fewer cards than this value, the next hand starts from a freshly shuffled shoe." />
        <input
          type="number"
          min={6}
          value={settings.cutCardThreshold}
          onChange={(event) => onChange("cutCardThreshold", numericInput(event.target.value, 6))}
        />
      </label>
      <label>
        <FieldCaption label="Random seed" tip="Optional text that makes the shuffle repeatable. Use the same seed to replay the same simulated sequence." />
        <input value={settings.seed ?? ""} onChange={(event) => onChange("seed", event.target.value || undefined)} placeholder="optional" />
      </label>
      <button className="secondary" onClick={onNewShoe}>
        <Shuffle size={16} /> New Shoe
      </button>
    </div>
  );
}

function HandArea({
  title,
  tone,
  cards,
  total,
}: {
  title: string;
  tone: "player" | "banker";
  hand?: BaccaratHand;
  cards: BaccaratHand["playerCards"];
  total?: number;
}) {
  return (
    <div className={`hand-area ${tone}`}>
      <h2>{title}</h2>
      <div className="cards">
        {cards.length ? cards.map((card, index) => <div className={`card ${card.suit}`} key={`${card.code}-${index}`}>{card.rank}<span>{card.suit[0].toUpperCase()}</span></div>) : [0, 1, 2].map((item) => <div className="card ghost" key={item} />)}
      </div>
      <div className="total">Total {total ?? "-"}</div>
    </div>
  );
}

function ManualPanel(props: {
  startingBankroll: number;
  setStartingBankroll: (value: number) => void;
  bankroll: number;
  baseUnit: number;
  setBaseUnit: (value: number) => void;
  stake: number;
  setStake: (value: number) => void;
  betSide: BetSide;
  setBetSide: (value: BetSide) => void;
  onDeal: () => void;
  onReset: () => void;
}) {
  return (
    <div className="panel betting-panel">
      <label>
        <FieldCaption label="Starting bankroll" tip="The pretend bankroll used by the manual table. Reset Session returns to this amount." />
        <input min={0} type="number" value={props.startingBankroll} onChange={(event) => props.setStartingBankroll(numericInput(event.target.value, 0))} />
      </label>
      <label>
        <FieldCaption label="Base unit" tip="Your smallest reference bet. Quick-bet buttons are common Martingale ladder values from this unit." />
        <input min={1} type="number" value={props.baseUnit} onChange={(event) => props.setBaseUnit(numericInput(event.target.value, 1))} />
      </label>
      <div className="bankroll-readout">{gbp(props.bankroll)}</div>
      <div className="segmented">
        <button className={props.betSide === "Player" ? "active player-bg" : ""} onClick={() => props.setBetSide("Player")}>Player</button>
        <button className={props.betSide === "Banker" ? "active banker-bg" : ""} onClick={() => props.setBetSide("Banker")}>Banker</button>
      </div>
      <label>
        <FieldCaption label="Stake" tip="Amount placed on the next manual Player or Banker bet. Manual betting is separate from Strategy Lab sessions." />
        <input min={0} type="number" value={props.stake} onChange={(event) => props.setStake(numericInput(event.target.value, 0))} />
      </label>
      <div className="quick-bets">
        {quickBets.map((amount) => (
          <button key={amount} onClick={() => props.setStake(amount)}>
            {gbp(amount)}
          </button>
        ))}
      </div>
      <button className="primary" onClick={props.onDeal}>
        <Play size={16} /> Deal Hand
      </button>
      <button className="secondary" onClick={props.onReset}>
        <RotateCcw size={16} /> Reset Session
      </button>
    </div>
  );
}

function RoadCharts({
  outcomes,
  source,
  setSource,
  hasLab,
}: {
  outcomes: Outcome[];
  source: "manual" | "lab";
  setSource: (source: "manual" | "lab") => void;
  hasLab: boolean;
}) {
  const bead = buildBeadPlate(outcomes);
  const bigRoad = buildBigRoad(outcomes);
  const maxCol = Math.max(10, ...bigRoad.map((cell) => cell.col + 1));
  return (
    <div className="panel">
      <div className="panel-title">
        <h2>
          Road Charts
          <HelpTip text="Visual baccarat outcome history. P is Player, B is Banker, and T is Tie. These charts show randomness; they do not predict the next hand." />
        </h2>
        <div className="segmented small">
          <button className={source === "manual" ? "active" : ""} onClick={() => setSource("manual")}>Manual</button>
          <button className={source === "lab" ? "active" : ""} disabled={!hasLab} onClick={() => setSource("lab")}>Strategy</button>
        </div>
      </div>
      <h3>Bead Plate</h3>
      <div className="road-grid bead" style={{ gridTemplateColumns: `repeat(${bead[0]?.length ?? 1}, 28px)` }}>
        {bead.flatMap((row, rowIndex) =>
          row.map((mark, colIndex) => <RoadCell key={`${rowIndex}-${colIndex}`} mark={mark} />),
        )}
      </div>
      <h3>Big Road</h3>
      <div className="big-road" style={{ gridTemplateColumns: `repeat(${maxCol}, 28px)` }}>
        {Array.from({ length: 6 * maxCol }).map((_, index) => {
          const row = index % 6;
          const col = Math.floor(index / 6);
          const cell = bigRoad.find((item) => item.row === row && item.col === col);
          return <RoadCell key={index} mark={cell?.outcome ?? ""} ties={cell?.ties} />;
        })}
      </div>
    </div>
  );
}

function RoadCell({ mark, ties }: { mark: Outcome | ""; ties?: number }) {
  return (
    <div className={`road-cell ${mark}`}>
      {mark && <span>{mark}</span>}
      {Boolean(ties) && <em>{ties}</em>}
    </div>
  );
}

function StatsPanel({ stats }: { stats: OutcomeStats }) {
  return (
    <div className="panel stats-panel">
      <h2>
        Outcome Statistics
        <HelpTip text="Counts and percentages for the currently selected manual or lab result. Banker wins are naturally a little more common than Player wins." />
      </h2>
      <div className="stat-grid">
        <Stat label="Total hands" value={stats.totalHands.toLocaleString()} />
        <Stat label="Player wins" value={`${stats.playerWins.toLocaleString()} (${pct(stats.playerWins, stats.totalHands)})`} />
        <Stat label="Banker wins" value={`${stats.bankerWins.toLocaleString()} (${pct(stats.bankerWins, stats.totalHands)})`} />
        <Stat label="Ties" value={`${stats.ties.toLocaleString()} (${pct(stats.ties, stats.totalHands)})`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StrategyLab(props: {
  settings: StrategySettings;
  setSettings: (settings: StrategySettings) => void;
  progression: number[];
  onRun: (type: "runChart" | "runStrategy" | "runStrategyBatch") => void;
  status: string;
  result?: SessionResult;
  batchSummary?: StrategyBatchSummary;
  overlayEnabled: boolean;
  setOverlayEnabled: (enabled: boolean) => void;
  isRunning: boolean;
}) {
  const update = <K extends keyof StrategySettings>(key: K, value: StrategySettings[K]) => {
    props.setSettings({ ...props.settings, [key]: value });
  };

  return (
    <section className="panel strategy-lab">
      <div className="panel-title">
        <h2>
          <FlaskConical size={18} /> Strategy Lab
          <HelpTip text="Runs local simulations in your browser so you can compare individual sessions and batches without risking money." />
        </h2>
        <label className="toggle">
          <input type="checkbox" checked={props.overlayEnabled} onChange={(event) => props.setOverlayEnabled(event.target.checked)} />
          Show manual overlay
        </label>
      </div>
      <div className="lab-grid">
        <label>
          <FieldCaption label="Strategy" tip="Choose the rule set to test. The Martingale profile waits for Banker then Player before betting Player; flat betting always uses the same Player stake." />
          <select value={props.settings.profile} onChange={(event) => update("profile", event.target.value as StrategySettings["profile"])}>
            <option value="player-after-banker-martingale">Player after Banker Martingale</option>
            <option value="flat-bet-player">Flat Bet Player</option>
          </select>
        </label>
        <label>
          <FieldCaption label="Bankroll" tip="Finite starting balance for each Strategy Lab session. A session stops when it cannot afford the next required bet." />
          <input type="number" min={0} value={props.settings.bankroll} onChange={(event) => update("bankroll", numericInput(event.target.value, 0))} />
        </label>
        <label>
          <FieldCaption label="Unit bet" tip="Starting stake. Martingale doubles this after losses; flat betting keeps this same amount every hand." />
          <input type="number" min={1} value={props.settings.baseUnit} onChange={(event) => update("baseUnit", numericInput(event.target.value, 1))} />
        </label>
        <label>
          <FieldCaption label="Bets in strategy session" tip="How many actual strategy bets to place before one simulated session stops, unless a profit target or bankroll stop happens first." />
          <input type="number" min={1} value={props.settings.targetBets} onChange={(event) => update("targetBets", Math.floor(numericInput(event.target.value, 1)))} />
        </label>
        <label>
          <FieldCaption label="Profit target" tip="Optional session stop. Set to 0 to disable; otherwise the session stops once profit reaches this amount." />
          <input type="number" min={0} value={props.settings.profitTarget} onChange={(event) => update("profitTarget", numericInput(event.target.value, 0))} />
        </label>
        <label>
          <FieldCaption label="Strategy sessions to run" tip="Number of independent sessions in the batch test. Larger numbers give a clearer picture but take longer." />
          <input type="number" min={1} value={props.settings.sessionRuns} onChange={(event) => update("sessionRuns", Math.floor(numericInput(event.target.value, 1)))} />
        </label>
        <label>
          <FieldCaption label="Chart hands" tip="Number of hands to deal only for chart visualization. This mode does not place strategy bets." />
          <input type="number" min={1} value={props.settings.chartHands} onChange={(event) => update("chartHands", Math.floor(numericInput(event.target.value, 1)))} />
        </label>
      </div>
      <div className="progression">
        <span>
          Next losing ladder
          <HelpTip text="The Martingale stake sequence if Player bets keep losing. A long enough losing run can exceed any finite bankroll." />
        </span>
        {props.progression.map((amount, index) => <b key={index}>{gbp(amount)}</b>)}
      </div>
      <div className="lab-actions">
        <button className="primary" disabled={props.isRunning} onClick={() => props.onRun("runChart")}>Run Chart Hands</button>
        <button className="primary" disabled={props.isRunning} onClick={() => props.onRun("runStrategy")}>Run Strategy Session</button>
        <button className="primary" disabled={props.isRunning} onClick={() => props.onRun("runStrategyBatch")}>Run Strategy Sessions</button>
        {props.status && <span className="status"><PauseCircle size={15} /> {props.status}</span>}
      </div>
      {props.batchSummary && (
        <div className="result-strip">
          <Stat label="Sessions run" value={props.batchSummary.sessions.toLocaleString()} />
          <Stat
            label="Profitable sessions"
            value={`${props.batchSummary.profitableSessions.toLocaleString()} (${props.batchSummary.profitablePercentage.toFixed(2)}%)`}
          />
          <Stat
            label="Profit target reached"
            value={`${props.batchSummary.targetReachedSessions.toLocaleString()} (${props.batchSummary.targetReachedPercentage.toFixed(2)}%)`}
          />
          <Stat label="Busted sessions" value={props.batchSummary.bustedSessions.toLocaleString()} />
          <Stat label="Average profit" value={gbp(props.batchSummary.averageProfit)} />
          <Stat label="Average final bankroll" value={gbp(props.batchSummary.averageFinalBankroll)} />
          <Stat label="Best / worst profit" value={`${gbp(props.batchSummary.bestProfit)} / ${gbp(props.batchSummary.worstProfit)}`} />
        </div>
      )}
      {props.result && (
        <div className="result-strip">
          <Stat label="Final bankroll" value={gbp(props.result.finalBankroll)} />
          <Stat label="Profit/Loss" value={gbp(props.result.profit)} />
          <Stat label="Hands dealt" value={props.result.hands.toLocaleString()} />
          <Stat label="Bets placed" value={props.result.bets.toLocaleString()} />
          <Stat label="Bet wins/losses/pushes" value={`${props.result.wins}/${props.result.losses}/${props.result.pushes}`} />
          <Stat label="Longest losing ladder" value={props.result.longestLosingLadder.toString()} />
          <Stat label="Largest drawdown" value={gbp(props.result.largestDrawdown)} />
          <Stat label="Stop reason" value={props.result.stopReason ?? "complete"} />
        </div>
      )}
    </section>
  );
}

function HistoryTable({ rows }: { rows: HandHistoryRow[] }) {
  return (
    <section className="panel history-panel">
      <h2>Session History</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Hand</th>
              <th>Shoe</th>
              <th>Player cards</th>
              <th>P total</th>
              <th>Banker cards</th>
              <th>B total</th>
              <th>Outcome</th>
              <th>Bet side</th>
              <th>Stake</th>
              <th>P/L</th>
              <th>Bankroll</th>
              <th>Strategy overlay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <HistoryRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HistoryRow({ row }: { row: HandHistoryRow }) {
  const displayedSide = row.manualBetSide ?? (row.strategy?.placedBet ? "Player" : "-");
  const displayedStake = row.stake || row.strategy?.stake || 0;
  const displayedProfit = row.manualBetSide ? row.profit : row.strategy?.profit ?? row.profit;

  return (
    <tr>
      <td>{row.id}</td>
      <td>{row.shoeNumber}</td>
      <td>{row.playerCards}</td>
      <td>{row.playerTotal}</td>
      <td>{row.bankerCards}</td>
      <td>{row.bankerTotal}</td>
      <td><span className={`tag ${row.outcome}`}>{row.outcome}</span></td>
      <td>{displayedSide}</td>
      <td>{displayedStake ? gbp(displayedStake) : "-"}</td>
      <td className={displayedProfit >= 0 ? "positive" : "negative"}>{gbp(displayedProfit)}</td>
      <td>{row.bankrollAfter ? gbp(row.bankrollAfter) : "-"}</td>
      <td>{formatStrategyOverlay(row)}</td>
    </tr>
  );
}

function formatStrategyOverlay(row: HandHistoryRow): string {
  const strategy = row.strategy;
  if (!strategy) return "-";
  if (strategy.stopped) return strategy.stopReason ?? "stopped";
  if (!strategy.placedBet && strategy.signal) return "signal, no bet";
  if (!strategy.placedBet) return strategy.active ? "active, no bet" : "waiting for signal";
  const entry = strategy.signal ? "entry" : "active";
  return `${entry} bet ${gbp(strategy.stake)} step ${strategy.step + 1}: ${strategy.betResult} (${gbp(strategy.profit)})`;
}
