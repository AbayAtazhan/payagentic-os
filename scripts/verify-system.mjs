// Algorithmic and Cryptographic Unit Test Suite for PayAgentic OS
import crypto from 'crypto';

console.log('========================================================');
console.log('🧪 PAYAGENTIC OS: ALGORITHMIC & CRYPTOGRAPHIC TEST SUITE');
console.log('========================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, detail = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName} ${detail ? `(${detail})` : ''}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// Test 1: Real Statistical Sample Variance and Z-Score Calculation
// -----------------------------------------------------------------------------
console.log('--- 1. STATISTICAL ANOMALY ENGINE TESTS ---');

function computeStats(values) {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (n - 1);
  return { mean, stdDev: Math.sqrt(variance) };
}

const sampleTransactions = [150, 220, 180, 290, 310, 240, 190, 210, 260, 350];
const { mean, stdDev } = computeStats(sampleTransactions);

assert(
  Math.abs(mean - 240) < 0.01,
  'Arithmetic Mean Calculation',
  `Computed mean: $${mean.toFixed(2)} USD`,
);

assert(
  stdDev > 50 && stdDev < 75,
  'Sample Standard Deviation Calculation',
  `Computed σ: $${stdDev.toFixed(2)} USD`,
);

// Anomaly test: $3,200 transaction
const anomalyAmount = 3200;
const zScore = (anomalyAmount - mean) / stdDev;
assert(
  zScore > 3.0,
  'Z-Score Anomaly Trigger (z >= 3.0σ)',
  `$3,200 is ${zScore.toFixed(2)}σ above mean`,
);

// Normal test: $250 transaction
const normalAmount = 250;
const normalZ = (normalAmount - mean) / stdDev;
assert(
  normalZ < 1.0,
  'Normal Transaction Passes Baseline (z < 1.0σ)',
  `$250 is only ${normalZ.toFixed(2)}σ above mean`,
);

// -----------------------------------------------------------------------------
// Test 2: Cryptographic SHA-256 Hash Chaining & Tamper Detection
// -----------------------------------------------------------------------------
console.log('\n--- 2. CRYPTOGRAPHIC AUDIT LEDGER TESTS ---');

function computeHash(index, timestamp, actionId, event, prevHash, details) {
  const payload = `${index}:${timestamp}:${actionId}:${event}:${prevHash}:${details}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

const ledger = [];
const genesisPrev = '0000000000000000000000000000000000000000000000000000000000000000';

// Block 0
const t0 = new Date().toISOString();
const h0 = computeHash(0, t0, 'ACT-001', 'QUEUED', genesisPrev, 'Queued for sign-off');
ledger.push({ index: 0, timestamp: t0, actionId: 'ACT-001', event: 'QUEUED', prevHash: genesisPrev, hash: h0, details: 'Queued for sign-off' });

// Block 1
const t1 = new Date().toISOString();
const h1 = computeHash(1, t1, 'ACT-001', 'MANUALLY_APPROVED', h0, 'Approved by merchant');
ledger.push({ index: 1, timestamp: t1, actionId: 'ACT-001', event: 'MANUALLY_APPROVED', prevHash: h0, hash: h1, details: 'Approved by merchant' });

// Verify intact chain
function verifyChain(chain) {
  for (let i = 0; i < chain.length; i++) {
    const expectedPrev = i === 0 ? genesisPrev : chain[i - 1].hash;
    if (chain[i].prevHash !== expectedPrev) return false;
    const recalculated = computeHash(
      chain[i].index,
      chain[i].timestamp,
      chain[i].actionId,
      chain[i].event,
      chain[i].prevHash,
      chain[i].details,
    );
    if (recalculated !== chain[i].hash) return false;
  }
  return true;
}

assert(verifyChain(ledger) === true, 'Valid Hash Chain Integrity Verified', 'Blocks 0 and 1 correctly chained');

// Tamper test: Alter details of Block 0
const tamperedLedger = JSON.parse(JSON.stringify(ledger));
tamperedLedger[0].details = 'Tampered unauthorized text';
assert(verifyChain(tamperedLedger) === false, 'Tamper Detection Active', 'Modifying block details breaks SHA-256 chain');

// -----------------------------------------------------------------------------
// Test 3: Enterprise Policy Boundary & Cap Enforcement
// -----------------------------------------------------------------------------
console.log('\n--- 3. ENTERPRISE GUARDRAILS POLICY BOUNDS ---');

const maxCap = 500.0;
const confidenceThreshold = 92;

function evaluatePayoutPolicy(amount, confidence) {
  if (amount > maxCap) {
    return { canAutoPilot: false, reason: 'EXCEEDS_CAP' };
  }
  if (confidence < confidenceThreshold) {
    return { canAutoPilot: false, reason: 'LOW_CONFIDENCE' };
  }
  return { canAutoPilot: true, reason: 'APPROVED_AUTONOMOUS' };
}

assert(
  evaluatePayoutPolicy(2500, 96).canAutoPilot === false,
  'Policy Guardrail: $2,500 Payout Intercepted',
  'Exceeds $500 cap -> Requires human operator sign-off',
);

assert(
  evaluatePayoutPolicy(350, 85).canAutoPilot === false,
  'Policy Guardrail: Sub-92% Confidence Intercepted',
  'Confidence 85% < 92% -> Requires human operator sign-off',
);

assert(
  evaluatePayoutPolicy(350, 96).canAutoPilot === true,
  'Policy Guardrail: Safe $350 Payout with 96% Confidence Allowed',
  'Satisfies cap <= $500 and confidence >= 92%',
);

// -----------------------------------------------------------------------------
// Test 4: Idempotency Key Format Verification
// -----------------------------------------------------------------------------
console.log('\n--- 4. IDEMPOTENCY KEY VERIFICATION ---');

function generateIdempotencyKey(actionId) {
  return `IDEMP-${actionId}-${Date.now()}`;
}

const idemp = generateIdempotencyKey('ACT-PAYOUT-01');
assert(
  idemp.startsWith('IDEMP-ACT-PAYOUT-01-') && idemp.length > 20,
  'PayPal Idempotency Header Generation',
  `Key: ${idemp}`,
);

console.log('\n========================================================');
console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('========================================================\n');
