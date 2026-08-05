# Trader Risk Dashboard

A dashboard that answers one question at a glance: **am I currently in danger of violating my account rules?**

Built for the Tradescape full-stack assignment.

- **Live demo:** _(https://trader-risk-dashboard-delta.vercel.app/)_
- **Stack:** React 19 + TypeScript + Vite, plain CSS, Vitest

---

## How to run

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm test         # 50 unit tests across the calculation layer
npm run build    # typecheck + production build
npm run lint
```

---

## What I built

The dashboard is organised around the risk question first and the history second.

**1. Risk indicator (the headline).** A single verdict — Safe / Approaching Limit / At Risk / Limit Breached — backed by two meters, one per account rule. Each shows the amount used, the amount remaining, and the percentage of the allowance consumed. The overall verdict is the *worst* of the two rules, and the message names whichever rule is driving it, so the trader knows what to act on.

**2. Account & performance.** Current balance, total P&L, win rate, winning/losing trade counts, and largest win/loss. Every figure is derived from the trade array.

**3. Room to trade** — my added feature (see below).

**4. Equity curve, session breakdown, trade history, and performance by asset.** The session list scores each losing day against the daily loss limit, so a bad day that came close to a breach is visible as such.

### Nothing is hardcoded

The brief quotes a current balance of $103,250. That number never appears in the source. `ACCOUNT` stores only the four given rules ($100,000 starting balance, $10,000 max drawdown, $5,000 daily loss limit); the balance is computed as `startingBalance + sum(pnl)`, and a test asserts it comes out to exactly $103,250. Same for the 60% win rate, the +$2,000 largest win, and every other figure.

### Structure

```
src/
  data/         Types and the trade/account mock data
  lib/          All calculations — pure functions, no React
    calculations.ts   P&L, stats, equity curve, drawdown, daily grouping
    risk.ts           Thresholds, verdict, and the sizing feature
    format.ts         Currency/percent formatting
    *.test.ts         50 unit tests
  components/   Presentation only
```

The `lib/` layer takes `(trades, account)` and returns plain data. It has no React import and is tested directly. Components format and lay out — they don't calculate. `StatCard` and `RiskMeter` are the reusable primitives; the meter is used for both drawdown and daily loss, and the stat card appears in both the performance grid and the sizing panel.

### Scenario switcher

The supplied data sits at an all-time equity high, which means the risk indicator would only ever render "Safe". Rather than ship a component whose other states are invisible, the header has a dataset selector with three extra scenarios — Approaching Limit, At Risk, and an empty account — so the logic can actually be seen working. The supplied data is the default.

---

## My additional feature: "Room to trade"

**What it is.** A panel that converts the remaining allowances into a decision about the *next* trade: your average losing trade is $375, you have $5,000 of daily buffer left, so you have room for roughly 13 more average losses today — and the drawdown rule allows 26, so today's limit is what binds. It also shows the largest single loss that would still leave both rules intact.

**Why I chose it.** The rest of the dashboard, including the risk indicator, is retrospective — it tells you where you stand. But "you have $1,300 of daily buffer remaining" is an abstract number, and the moment that matters to a trader is right before they size the next position. Translating the buffer into *number of trades at your own typical losing size* makes it concrete and forward-looking, and it uses the trader's actual behaviour rather than a generic rule of thumb.

It also degrades honestly: with no losing trades on record there is nothing to extrapolate from, so it says so instead of inventing a number.

I considered an equity curve as the headline feature, but it mostly restates history that the trade table already covers. I included a small one anyway — it gives the drawdown figure visual context by showing the peak it is measured from — but the sizing guidance is the piece I think genuinely changes a decision.

---

## Product questions

**1. What is drawdown in trading?**

Drawdown is the decline in account equity from a peak to a subsequent trough — how much you have given back from your high-water mark. It is measured from the peak, not from the starting balance, which is why an account can be up overall and still be in drawdown. If equity runs from $100k to $106k and then falls to $103k, the trader is $3k in profit but $3k in drawdown. Prop firms use it as the primary risk rule because it captures the *volatility* of the account, not just the outcome.

**2. Why would a trader care about remaining drawdown rather than just current P&L?**

Because P&L tells you how you did, and remaining drawdown tells you whether you still have an account. Under an evaluation account, breaching the drawdown limit ends it regardless of how profitable you were beforehand — a trader up $8,000 who then gives back $10,000 from the peak is not "up $8,000 minus a bad week", they're out.

Remaining drawdown is also the constraint that actually governs the next decision. P&L is a backward-looking scoreboard; remaining drawdown is a forward-looking budget. It answers "how much room do I have to be wrong?", which is the question that determines position size. That's precisely the gap the "Room to trade" panel targets: two traders with identical P&L can have very different amounts of room left, depending on how they got there.

**3. If you had another day, what would you improve?**

- **Real intraday timestamps and a live-day model.** Right now "today" is the latest date in the dataset. Real trades carry times, sessions cross midnight in different timezones, and the daily limit resets on the broker's clock, not the browser's.
- **Open positions.** Everything here is realised P&L. A trader with an open losing position has unrealised drawdown that counts against the limit but is invisible on this dashboard — that's the most significant modelling gap.
- **Trailing vs. static drawdown as a configurable rule.** I implemented peak-to-trough (see assumptions); real firms vary, and some trail the peak only up to the initial balance. This should be a property of the account, not a hardcoded choice.
- **Component tests.** The calculation layer is well covered, but the components have none. I verified rendering across all four scenarios and both breakpoints in a real browser, but that check isn't automated.
- **Projected breach warnings** — "at your current loss rate, you'd breach the daily limit in ~2 trades" — building on the sizing panel.
- **Accessibility polish.** Risk state is conveyed by colour plus a text label; I'd add an icon per state so it isn't colour-dependent at all, and audit contrast properly.

---

## Assumptions

The brief left a few things unspecified. Where I had to choose, I chose the interpretation that is most standard in trading and documented it:

1. **Drawdown is peak-to-trough**, measured from the running high-water mark, not `startingBalance - currentBalance`. The latter would report a *negative* drawdown for any profitable account and would miss a giveback from a high. With the supplied data the account is at its peak, so current drawdown is $0 and the full $10,000 remains.

2. **Trades needed dates.** "Current day's loss" is undefined without them, so I assigned the five supplied trades across three sessions (3–5 Aug). P&L values are untouched. "Today" is the most recent date in the data rather than the wall clock, so the dashboard stays meaningful with static mock data.

3. **Risk thresholds are mine.** The brief names three states but not the cut-offs. I used: Safe below 50% of an allowance consumed, Approaching Limit at 50–80%, At Risk above 80%, and a separate Breached state at 100%. They live in one constant (`RISK_THRESHOLDS`) and are easy to change.

4. **Breakeven trades** (exactly $0) are counted separately and excluded from the win-rate denominator, rather than being silently folded into losses.

## Edge cases handled

Empty trade list (no division by zero in win rate; `Math.max` never called on an empty array); all-winning or all-losing sets (missing figures render as `—`, not `NaN` or `-Infinity`); breached limits (remaining values clamp at 0 rather than going negative); a zero or missing limit (utilisation guards against `NaN`/`Infinity`); a flat equity curve (the sparkline's range guard prevents divide-by-zero); and unsorted input (trades are sorted chronologically before the equity curve is built, with stable ordering for same-day trades).
