import { useMemo, useState } from 'react';
import './App.css';
import { ACCOUNT, SCENARIOS } from './data/mockData';
import {
  buildEquityCurve,
  calculateCurrentBalance,
  calculateDailyPnl,
  calculatePerformanceByAsset,
  calculateTotalPnl,
  calculateTradeStats,
  sortTradesChronologically,
} from './lib/calculations';
import { assessRisk, calculateSizingGuidance } from './lib/risk';
import { formatCurrency, formatPercent, formatSignedCurrency } from './lib/format';
import { DailyBreakdown } from './components/DailyBreakdown';
import { EquitySparkline } from './components/EquitySparkline';
import { RiskIndicator } from './components/RiskIndicator';
import { SizingGuidance } from './components/SizingGuidance';
import { StatsGrid } from './components/StatsGrid';
import { TradeTable } from './components/TradeTable';

export default function App() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const trades = scenario.trades;

  // Every figure on the page comes from this one derivation pass over the trades.
  const derived = useMemo(
    () => ({
      ordered: sortTradesChronologically(trades),
      totalPnl: calculateTotalPnl(trades),
      currentBalance: calculateCurrentBalance(trades, ACCOUNT),
      stats: calculateTradeStats(trades),
      curve: buildEquityCurve(trades, ACCOUNT),
      days: calculateDailyPnl(trades),
      assessment: assessRisk(trades, ACCOUNT),
      guidance: calculateSizingGuidance(trades, ACCOUNT),
      byAsset: calculatePerformanceByAsset(trades),
    }),
    [trades],
  );

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">Trader Risk Dashboard</h1>
          <p className="app__subtitle">
            Evaluation account · {formatCurrency(ACCOUNT.startingBalance)} starting balance
          </p>
        </div>

        <div className="scenario">
          <label className="scenario__label" htmlFor="scenario">
            Dataset
          </label>
          <select
            id="scenario"
            className="scenario__select"
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="scenario__hint">{scenario.description}</p>
        </div>
      </header>

      <main className="app__main">
        {/* The headline question: am I in danger of breaking my rules? */}
        <RiskIndicator assessment={derived.assessment} account={ACCOUNT} />

        <section className="panel" aria-labelledby="overview-heading">
          <header className="panel__head">
            <h2 className="panel__title" id="overview-heading">
              Account &amp; performance
            </h2>
          </header>
          <StatsGrid
            account={ACCOUNT}
            currentBalance={derived.currentBalance}
            totalPnl={derived.totalPnl}
            stats={derived.stats}
          />
        </section>

        {/* The added feature. */}
        <SizingGuidance guidance={derived.guidance} />

        <div className="two-col">
          <section className="panel" aria-labelledby="equity-heading">
            <header className="panel__head">
              <h2 className="panel__title" id="equity-heading">
                Equity curve
              </h2>
            </header>
            <EquitySparkline
              curve={derived.curve}
              startingBalance={ACCOUNT.startingBalance}
            />
          </section>

          <section className="panel" aria-labelledby="days-heading">
            <header className="panel__head">
              <h2 className="panel__title" id="days-heading">
                By session
              </h2>
            </header>
            <DailyBreakdown days={derived.days} account={ACCOUNT} />
          </section>
        </div>

        <div className="two-col">
          <section className="panel" aria-labelledby="trades-heading">
            <header className="panel__head">
              <h2 className="panel__title" id="trades-heading">
                Trade history
              </h2>
            </header>
            <TradeTable trades={derived.ordered} />
          </section>

          <section className="panel" aria-labelledby="assets-heading">
            <header className="panel__head">
              <h2 className="panel__title" id="assets-heading">
                By asset
              </h2>
            </header>
            {derived.byAsset.length === 0 ? (
              <p className="empty-note">No assets traded yet.</p>
            ) : (
              <ul className="asset-list">
                {derived.byAsset.map((asset) => (
                  <li key={asset.asset} className="asset-row">
                    <span className="asset-row__name">{asset.asset}</span>
                    <span className="text-muted">
                      {asset.tradeCount} {asset.tradeCount === 1 ? 'trade' : 'trades'} ·{' '}
                      {formatPercent(asset.winRate)} win
                    </span>
                    <span
                      className={
                        asset.pnl > 0
                          ? 'text-positive'
                          : asset.pnl < 0
                            ? 'text-negative'
                            : 'text-muted'
                      }
                    >
                      {formatSignedCurrency(asset.pnl)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <footer className="app__footer">
        All figures derived from the trade data — nothing on this page is hardcoded.
      </footer>
    </div>
  );
}
