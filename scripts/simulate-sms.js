/**
 * SMS Simulation Script — Tests the agent locally without Africa's Talking.
 * Run: npm run simulate
 */
import 'dotenv/config';

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

const TEST_MESSAGES = [
  // The "Google Maps cannot solve" reasoning test
  { from: '+254700000000', text: 'how do I get from Kawangware to Ruai right now?' },

  // Route queries
  { from: '+254700100100', text: 'How do I get from CBD to Westlands?' },
  { from: '+254700100101', text: 'Route 105' },
  { from: '+254700100102', text: 'mat to kikuyu from odeon' },
  { from: '+254700100103', text: 'eastleigh to umoja' },
  { from: '+254700100104', text: 'Rt 34' },

  // Live reports
  { from: '+254700200200', text: 'Heavy jam at Kangemi roundabout on Waiyaki Way' },
  { from: '+254700200201', text: 'Accident along Jogoo Road near Donholm' },
  { from: '+254700200202', text: 'Msongamano Thika Road Roysambu' },

  // Fare checks
  { from: '+254700300300', text: 'Bei ya mat CBD to Karen?' },
  { from: '+254700300301', text: 'How much from Railways to Rongai?' },

  // Safety alerts
  { from: '+254700400400', text: 'Wizi reported at Eastleigh stage after 9pm' },

  // Sheng / Swahili
  { from: '+254700500500', text: 'Mathree ya kupanda Kasarani iko wapi CBD?' },

  // Unknown
  { from: '+254700600600', text: 'Hello what is this service?' },
];

async function simulate() {
  console.log('🧪 Matatu Agent SMS Simulator\n');
  console.log(`Target: ${BASE_URL}/api/simulate\n`);
  console.log('─'.repeat(60));

  for (const msg of TEST_MESSAGES) {
    console.log(`\n📱 FROM: ${msg.from}`);
    console.log(`📝 SMS:  "${msg.text}"`);

    try {
      const res = await fetch(`${BASE_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });

      const data = await res.json();

      if (data.response) {
        console.log(`🤖 INTENT:  ${data.response.intent} (${(data.response.confidence * 100).toFixed(0)}%)`);
        console.log(`💬 REPLY:   "${data.response.smsReply}"`);
        console.log(`📏 LENGTH:  ${data.response.smsReply?.length || 0}/160 chars`);
        console.log(`⏱️  TIME:    ${data.response.processingTimeMs}ms`);
        if (data.response.escalate) console.log('🚨 ESCALATED!');
      } else {
        console.log('❌ Error:', JSON.stringify(data));
      }
    } catch (err) {
      console.log(`❌ Connection error: ${err.message}`);
    }

    console.log('─'.repeat(60));
  }

  console.log('\n✅ Simulation complete.');
}

simulate();
