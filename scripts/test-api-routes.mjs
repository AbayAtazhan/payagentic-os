// Comprehensive runtime HTTP route and security tester for PayAgentic OS
import { spawn } from 'child_process';

const PORT = 3012;

console.log(`Starting Next.js server on port ${PORT}...`);
const serverProcess = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(PORT) },
});

let outputLog = '';
serverProcess.stdout.on('data', (d) => {
  outputLog += d.toString();
});
serverProcess.stderr.on('data', (d) => {
  outputLog += d.toString();
});

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('Waiting for server startup...');
  await wait(3000);

  const base = `http://localhost:${PORT}`;

  try {
    // 1. Health check
    console.log('1. Testing GET /api/health ...');
    const healthRes = await fetch(`${base}/api/health`);
    const healthJson = await healthRes.json();
    console.log('   Status:', healthRes.status, 'Payload:', healthJson.status);
    if (healthRes.status !== 200 || healthJson.status !== 'healthy') throw new Error('Health check failed');

    // 2. Credentials status
    console.log('2. Testing GET /api/paypal/credentials ...');
    const credsRes = await fetch(`${base}/api/paypal/credentials`);
    const credsJson = await credsRes.json();
    console.log('   Status:', credsRes.status, 'SimulationMode:', credsJson.simulationMode);
    if (credsRes.status !== 200) throw new Error('Credentials check failed');

    // 3. Webhook receiver
    console.log('3. Testing POST /api/paypal/webhook (simulated invoice paid) ...');
    const whRes = await fetch(`${base}/api/paypal/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'INVOICING.INVOICE.PAID',
        id: 'WH-TEST-001',
        resource: { id: 'INV2-SIM-TEST' },
      }),
    });
    const whJson = await whRes.json();
    console.log('   Status:', whRes.status, 'Received:', whJson.received, 'Event:', whJson.event_type);
    if (whRes.status !== 200 || !whJson.received) throw new Error('Webhook test failed');

    // 4. Strict input validation check: negative amount rejection
    console.log('4. Testing input validation on /api/operations (negative amount) ...');
    const invalidAmtRes = await fetch(`${base}/api/operations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'create_and_send_invoice',
        data: {
          recipientEmail: 'valid@example.com',
          amount: '-500',
        },
      }),
    });
    const invalidAmtJson = await invalidAmtRes.json();
    console.log('   Status:', invalidAmtRes.status, 'Expected Error:', invalidAmtJson.error);
    if (invalidAmtRes.status !== 400) throw new Error('Negative amount validation failed');

    // 5. Strict input validation check: malformed email rejection
    console.log('5. Testing input validation on /api/operations (malformed email) ...');
    const invalidEmailRes = await fetch(`${base}/api/operations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'create_and_send_invoice',
        data: {
          recipientEmail: 'not-an-email',
          amount: '150.00',
        },
      }),
    });
    const invalidEmailJson = await invalidEmailRes.json();
    console.log('   Status:', invalidEmailRes.status, 'Expected Error:', invalidEmailJson.error);
    if (invalidEmailRes.status !== 400) throw new Error('Email format validation failed');

    // 6. Valid operations mutation
    console.log('6. Testing valid operation: create invoice ...');
    const validOpRes = await fetch(`${base}/api/operations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'create_and_send_invoice',
        data: {
          recipientEmail: 'finance@verified-corp.example.com',
          amount: '890.00',
          itemName: 'Enterprise Cloud Service',
        },
      }),
    });
    const validOpJson = await validOpRes.json();
    console.log('   Status:', validOpRes.status, 'Invoice ID:', validOpJson.result?.invoiceId);
    if (validOpRes.status !== 200 || !validOpJson.success) throw new Error('Valid operation failed');

    // 7. Agent state & actions count
    console.log('7. Testing GET /api/agent ...');
    const agentRes = await fetch(`${base}/api/agent`);
    const agentJson = await agentRes.json();
    console.log('   Status:', agentRes.status, 'Actions count:', agentJson.actions?.length);
    if (agentRes.status !== 200 || !agentJson.success) throw new Error('Agent scan failed');

    console.log('\n🌟 ALL 7 STRICT RUNTIME & SECURITY TESTS PASSED FLAWLESSLY!');
  } catch (err) {
    console.error('Test execution failed:', err);
    console.error('Server output was:', outputLog);
    process.exitCode = 1;
  } finally {
    console.log('Shutting down test server...');
    serverProcess.kill('SIGTERM');
  }
}

runTests();
