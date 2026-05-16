/**
 * Matatu Route Intelligence Agent — Africa's Talking SMS Service
 * Handles inbound webhook parsing and outbound SMS delivery.
 */
import AfricasTalking from 'africastalking';
import config from '../config/index.js';

// ─── Initialize Africa's Talking SDK ───
let at = null;
let sms = { send: async () => ({ SMSMessageData: { Recipients: [{ statusCode: 'skipped (no key)' }] } }) };

if (config.at.apiKey && !config.at.apiKey.includes('your_')) {
  try {
    at = AfricasTalking({
      apiKey: config.at.apiKey,
      username: config.at.username,
    });
    sms = at.SMS;
  } catch (err) {
    console.error('[AT] Initialization failed:', err.message);
  }
} else {
  console.warn('[AT] Running in MOCK mode (no API key)');
}

/**
 * Sends an SMS reply to a commuter.
 *
 * @param {string} to - Recipient phone number (international format +254...).
 * @param {string} message - SMS text (must be ≤160 chars).
 * @returns {Promise<Object>} Africa's Talking API response.
 */
export async function sendSms(to, message) {
  // Hard enforce 160-char limit
  const safeMessage = message.length > 160
    ? message.substring(0, 157) + '...'
    : message;

  try {
    const result = await sms.send({
      to: [to],
      message: safeMessage,
      from: config.at.shortcode || undefined,
    });

    console.log(`[AT] SMS sent to ${to.slice(0, 7)}***: ${result.SMSMessageData?.Recipients?.[0]?.statusCode || 'sent'}`);
    return result;

  } catch (error) {
    console.error('[AT] SMS send error:', error.message);
    throw error;
  }
}

/**
 * Parses the inbound SMS webhook payload from Africa's Talking.
 * AT sends POST with form-urlencoded body: { from, to, text, date, id, linkId }
 *
 * @param {Object} body - Express req.body (parsed by urlencoded middleware).
 * @returns {Object} Normalized inbound message object.
 */
export function parseInboundSms(body) {
  return {
    from: body.from || body.From || '',
    to: body.to || body.To || '',
    text: (body.text || body.Text || '').trim(),
    date: body.date || body.Date || new Date().toISOString(),
    messageId: body.id || body.Id || null,
    linkId: body.linkId || body.LinkId || null,
  };
}

/**
 * Sends a bulk SMS to multiple recipients (for alert broadcasting).
 *
 * @param {string[]} recipients - Array of phone numbers.
 * @param {string} message - Alert message.
 * @returns {Promise<Object>} API response.
 */
export async function broadcastAlert(recipients, message) {
  const safeMessage = message.length > 160
    ? message.substring(0, 157) + '...'
    : message;

  try {
    const result = await sms.send({
      to: recipients,
      message: safeMessage,
      from: config.at.shortcode || undefined,
    });
    console.log(`[AT] Broadcast sent to ${recipients.length} recipients`);
    return result;
  } catch (error) {
    console.error('[AT] Broadcast error:', error.message);
    throw error;
  }
}

export default { sendSms, parseInboundSms, broadcastAlert };
