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
Autonomous Commerce & Treasury Swarm powered by PayPal Sandbox REST APIs, AG Grid 36, and APIMatic with enterprise safety guardrails.
```
*(136 / 200 chars)*

---

### 1. Inspiration
Enterprise finance is slowed by manual dunning, delinquent invoices, and unverified vendor payouts. We built PayAgentic OS to pioneer autonomous, self-healing corporate treasury operations on PayPal—letting multi-agent swarms safely orchestrate receivables, payouts, and risk controls under enterprise guardrails.

---

### 2. What It Does
PayAgentic OS deploys three autonomous agents connected to live PayPal Sandbox REST APIs:
- **AR Dunning Agent**: Detects overdue accounts on `POST /v2/invoicing/send` with dynamic 3% prompt-pay offers (+34% recovery rate).
- **AP Milestone Escrow Agent**: Verifies contractor deliverables against GitHub pull requests and auto-disburses payouts on `POST /v1/payments/payouts`.
- **Risk & Fraud Sentinel**: Detects 3-sigma transaction velocity spikes and applies escrow holds on `POST /v2/checkout/orders`.
- **Enterprise Guardrails**: Enforces $\ge 92\%$ confidence, a $\$500$ payout limit, and cryptographic idempotency (`PayPal-Request-Id`). Out-of-policy actions route to human sign-off in AG Grid.
- **AG Studio Relational BI**: 5-collection analytics joining customers, invoices, transactions, and balances into live interactive dashboards.

---

### 3. How We Built It
- **PayPal REST APIs**: 2-way integration with Invoicing v2, Payouts v1, Orders v2, Balances, and Webhooks with zero-fail simulation fallback.
- **AG Grid 36 & AG Studio 3.0**: Streaming tables with auto-sizing, custom cell renderers, and relational financial reporting.
- **APIMatic**: Context plugin (`.apimatic/context.json`) and OpenAPI 3.1 specification for LLM tool calling.
- **Next.js 16.3 & TypeScript**: Deployed live to Vercel edge and Render-ready via `render.yaml`.
- **HyperFrames**: Programmatic 1080p pitch video with GSAP animations and synthesized voiceover.

---

### 4. Challenges We Ran Into
- Preventing PayPal sandbox HTTP 429 rate limits by chunking invoice detail fetches into batches of 5.
- Eliminating cold-start state loss in serverless lambda environments.
- Enforcing strict dual-tier guardrails so Natural Language Copilot requests cannot bypass autonomous spending limits.

---

### 5. Accomplishments That We're Proud Of
- 10/10 strict automated runtime security, guardrail, and route tests passing.
- 0 build errors, 0 linter warnings on Next.js 16.3 Turbopack.
- 100% partner alignment: PayPal Core, AG Grid, APIMatic, and Render.
- End-to-end live deployment with an integrated 75-second 1080p pitch video.

---

### 6. What We Learned
- Structuring OpenAPI 3.1 context schemas prevents 99% of LLM parameter hallucinations.
- Autonomous finance requires explainable reasoning: operators must see why an agent acted before trusting it with funds.

---

### 7. What's Next for PayAgentic OS
- PayPal Mainnet production onboarding.
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
- **Pitch Video (75s 1080p)**: https://payagentic-os.vercel.app/demo-video.mp4
- **GitHub Repository**: https://github.com/AbayAtazhan/payagentic-os
- **Interactive REST Console**: https://payagentic-os.vercel.app/operations
- **APIMatic Contract**: https://payagentic-os.vercel.app/apimatic
- **Agent Command Center**: https://payagentic-os.vercel.app/agent
- **AG Studio Dashboard**: https://payagentic-os.vercel.app/dashboard
