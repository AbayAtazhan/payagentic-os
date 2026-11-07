# PayAgentic OS · Devpost Submission Kit

> **Character-Optimized for Devpost Limits**: Pre-trimmed so you can copy and paste directly into each field without hitting character limits or red error warnings.

---

### Project Title (Max 50 characters)
```text
PayAgentic OS
```
*(13 / 50 chars)*

---

### Elevator Pitch / Tagline (Max 200 characters)
```text
Autonomous AI Copilot & Treasury Swarm on PayPal Sandbox REST APIs, AG Grid 36, and APIMatic with institutional safety guardrails.
```
*(131 / 200 chars)*

---

### 1. Inspiration
Online merchants lose countless hours manually chasing overdue invoices, reconciling milestone payouts, and monitoring anomalous transaction spikes. We built PayAgentic OS to explore autonomous financial operations on the PayPal Developer Platform—allowing intelligent subagents to safely automate receivables, vendor disbursements, and risk screening under strict institutional guardrails.

---

### 2. What It Does
PayAgentic OS orchestrates three financial subagents integrated with live PayPal Sandbox REST APIs:
- **AR Dunning Agent**: Evaluates overdue invoice aging on `POST /v2/invoicing/send`, attaching dynamic 3% prompt-settlement discounts to encourage immediate clearance.
- **AP Milestone Agent**: Evaluates contractor milestone deliverables and executes batch payouts via `POST /v1/payments/payouts` with mandatory idempotency keys.
- **Risk & Fraud Sentinel**: Computes the historical mean ($\mu$) and standard deviation ($\sigma$) over all transactions, mathematically flagging anomalies where $z \ge 2.0\sigma$ and placing settlements in temporary escrow.
- **Institutional Guardrails**: Enforces a $\ge 92\%$ confidence floor, a $\$500.00$ payout ceiling, and a cryptographically hash-chained SHA-256 audit ledger. Out-of-policy requests route to human sign-off in AG Grid.
- **AG Studio Relational BI**: 5-collection analytics joining customers, invoices, line items, transactions, and balances into interactive dashboards.

---

### 3. How We Built It
- **PayPal REST APIs**: 2-way integration with Invoicing v2, Batch Payouts v1, Checkout Orders v2, Balances, and Webhooks with high-fidelity simulation fallback.
- **AG Grid 36 & AG Studio 3**: Interactive action grid with custom approval cell renderers and relational financial intelligence.
- **APIMatic**: OpenAPI 3.1 specification contract and `.apimatic/context.json` plugin directly grounding LLM tool definitions.
- **Next.js 16.3 & TypeScript**: Server-side security, deployed to Vercel edge and Render-ready via `render.yaml`.
- **HyperFrames**: Programmatic 1080p demo video with GSAP animations and neural narration.

---

### 4. Challenges We Ran Into
- Preventing PayPal sandbox HTTP 429 rate limits by chunking invoice detail fetches into batches of 5.
- Implementing a mathematically sound statistical anomaly detector that calculates true sample variance across sparse sandbox transaction histories.
- Designing dual-tier safety boundaries ensuring Natural Language Copilot commands cannot bypass autonomous spending limits.

---

### 5. Accomplishments That We're Proud Of
- 10/10 automated unit and cryptographic tests passing, including real sample variance calculations and SHA-256 tamper-evident chain verification.
- Complete partner integration: PayPal Sandbox REST APIs, AG Grid 36, APIMatic OpenAPI 3.1, and Render deployment blueprint.
- Zero-dependency deterministic offline mode allowing judges to test the complete agent workflow without requiring paid API keys.

---

### 6. What We Learned
- Grounding AI agents in formal OpenAPI 3.1 contracts via APIMatic dramatically reduces parameter hallucination when invoking nested REST endpoints.
- Autonomous finance requires explainable reasoning: operators must see exact mathematical rationale (e.g. z-scores, aging days) before delegating fund movements to an agent.

---

### 7. What's Next for PayAgentic OS
- PayPal Mainnet onboarding and live webhook signature verification.
- Multi-currency cross-border hedging using streaming balance telemetry.
- Mobile push notifications for instant one-tap merchant approvals.

---

### 8. Built With (Tags)
```text
paypal, next.js, typescript, ag-grid, ag-studio, apimatic, render, vercel, hyperframes, gsap, tailwindcss, react, openapi, node.js
```

---

### 9. Try It Out (Links)
- **Live Production URL**: https://payagentic-os.vercel.app
- **Pitch Video (1080p)**: https://payagentic-os.vercel.app/demo-video.mp4
- **GitHub Repository**: https://github.com/AbayAtazhan/payagentic-os
- **Agent Command Center**: https://payagentic-os.vercel.app/agent
- **AG Studio Dashboard**: https://payagentic-os.vercel.app/dashboard
- **Interactive REST Console**: https://payagentic-os.vercel.app/operations
- **APIMatic Contract**: https://payagentic-os.vercel.app/apimatic
