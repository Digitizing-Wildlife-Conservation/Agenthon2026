/**
 * Matatu Route Intelligence Agent — Express Server
 * Exposes the SMS webhook endpoint and monitoring API.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config, { validateConfig } from './config/index.js';
import { parseInboundSms, sendSms } from './services/africastalking.js';
import { handleInboundSms } from './agents/route-agent.js';
import { getActiveReports } from './services/supabase.js';

// ─── Validate environment on startup ───
try {
  validateConfig();
} catch (err) {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
}

const app = express();

// ─── Middleware ───
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('short'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limit: 60 requests/min per IP (for webhook + API)
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

// Serve the monitoring dashboard
app.use('/dashboard', express.static('dashboard'));

// ═══════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'matatu-route-intelligence-agent',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ═══════════════════════════════════════════
// SMS WEBHOOK — Africa's Talking Callback
// ═══════════════════════════════════════════
// AT sends POST with form-urlencoded: { from, to, text, date, id, linkId }
app.post('/sms/incoming', async (req, res) => {
  // Immediately respond 200 to AT (they expect fast ACK)
  res.status(200).json({ status: 'received' });

  const inbound = parseInboundSms(req.body);
  console.log(`\n📱 SMS from ${inbound.from}: "${inbound.text}"`);

  if (!inbound.text || inbound.text.length === 0) {
    console.log('[Server] Empty SMS received, ignoring.');
    return;
  }

  try {
    // Process through the agent pipeline
    const result = await handleInboundSms(inbound);

    console.log(`🤖 [${result.intent}] (${(result.confidence * 100).toFixed(0)}%) → "${result.smsReply}"`);
    console.log(`⏱️  ${result.processingTimeMs}ms`);

    // Send the reply SMS
    await sendSms(inbound.from, result.smsReply);

    // Handle safety escalations
    if (result.escalate) {
      console.log('🚨 SAFETY ALERT ESCALATED — requires human review');
      // TODO: Notify admin via separate channel (email, Slack, etc.)
    }
  } catch (err) {
    console.error('[Server] SMS processing error:', err.message);
    try {
      await sendSms(inbound.from, 'Samahani, kuna tatizo. Jaribu tena baadaye.');
    } catch (_) { /* silent */ }
  }
});

// ═══════════════════════════════════════════
// SMS DELIVERY REPORT CALLBACK
// ═══════════════════════════════════════════
app.post('/sms/delivery', (req, res) => {
  console.log('[AT] Delivery report:', JSON.stringify(req.body));
  res.status(200).json({ status: 'ok' });
});

// ═══════════════════════════════════════════
// API — Active Reports (for dashboard)
// ═══════════════════════════════════════════
app.get('/api/reports', async (_req, res) => {
  try {
    const reports = await getActiveReports({ limit: 50 });
    res.json({ reports, count: reports.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════
// API — Simulate SMS (development only)
// ═══════════════════════════════════════════
if (config.env === 'development') {
  app.post('/api/simulate', async (req, res) => {
    const { from, text } = req.body;
    if (!from || !text) {
      return res.status(400).json({ error: 'Missing "from" and "text" fields' });
    }

    const inbound = { from, text, date: new Date().toISOString(), messageId: `sim-${Date.now()}` };
    console.log(`\n🧪 SIMULATED SMS from ${from}: "${text}"`);

    try {
      const result = await handleInboundSms(inbound);
      res.json({
        inbound: { from, text },
        response: result,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// ═══════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════
app.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   🚐 MATATU ROUTE INTELLIGENCE AGENT                 ║
║   ─────────────────────────────────────────────────   ║
║   Port:       ${String(config.port).padEnd(40)}║
║   Env:        ${config.env.padEnd(40)}║
║   Model:      ${config.gcp.model.padEnd(40)}║
║   Shortcode:  ${config.at.shortcode.padEnd(40)}║
║   ─────────────────────────────────────────────────   ║
║   SMS Webhook:  POST /sms/incoming                    ║
║   Dashboard:    GET  /dashboard                       ║
║   Health:       GET  /health                          ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
