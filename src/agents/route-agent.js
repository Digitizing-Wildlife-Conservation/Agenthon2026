/**
 * Matatu Route Intelligence Agent — Core Agent Orchestrator
 *
 * This is the central brain that:
 *   1. Receives parsed inbound SMS
 *   2. Pre-fetches relevant context from Supabase
 *   3. Sends the enriched prompt to Gemini 2.5 Pro
 *   4. Processes the structured JSON response
 *   5. Persists reports and logs to Supabase
 *   6. Returns the SMS reply for delivery
 */
import crypto from 'crypto';
import { processWithGemini } from '../services/vertex-ai.js';
import {
  findRoutes, getRouteByNumber, insertReport,
  getActiveReports, logMessage, isRateLimited,
} from '../services/supabase.js';

/**
 * Hashes a phone number for privacy-safe storage.
 * @param {string} phone - Raw phone number.
 * @returns {string} SHA-256 hex hash.
 */
function hashPhone(phone) {
  return crypto.createHash('sha256').update(phone).digest('hex');
}

/**
 * Quick pre-classification to extract route numbers and locations from raw SMS.
 * This enables pre-fetching relevant data before sending to Gemini.
 *
 * @param {string} text - Raw SMS text.
 * @returns {Object} Extracted hints: { routeNumbers, locations, possibleIntent }
 */
function extractHints(text) {
  const normalized = text.toLowerCase().trim();

  // Extract route numbers (e.g., "105", "rt 34", "route 44")
  const routePattern = /(?:rt|route|no\.?|#)\s*(\d{1,3})|^(\d{1,3})(?:\s|$)/gi;
  const routeNumbers = [];
  let match;
  while ((match = routePattern.exec(normalized)) !== null) {
    routeNumbers.push(match[1] || match[2]);
  }

  // Extract location hints
  const knownLocations = [
    'cbd', 'westlands', 'eastleigh', 'kangemi', 'kikuyu', 'uthiru',
    'kasarani', 'roysambu', 'zimmerman', 'githurai', 'ruiru', 'thika',
    'donholm', 'embakasi', 'umoja', 'buruburu', 'jogoo', 'pangani',
    'parklands', 'karen', 'langata', 'rongai', 'athi river', 'jkia',
    'south b', 'south c', 'nairobi west', 'ngong', 'ruaka', 'banana',
    'village market', 'odeon', 'kencom', 'railways', 'otc', 'ngara',
    'kahawa', 'mwiki', 'pipeline', 'fedha', 'komarock', 'kayole',
    'dandora', 'huruma', 'mathare', 'kileleshwa', 'lavington', 'kilimani',
  ];

  const locations = knownLocations.filter(loc => normalized.includes(loc));

  // Quick intent guess for pre-fetching
  const reportKeywords = ['jam', 'traffic', 'accident', 'breakdown', 'police', 'roadblock', 'msongamano', 'delay', 'rain', 'flood'];
  const safetyKeywords = ['dangerous', 'robbery', 'theft', 'unsafe', 'hatari', 'wizi'];
  const fareKeywords = ['fare', 'bei', 'how much', 'ngapi', 'price', 'cost'];

  let possibleIntent = 'ROUTE_QUERY';
  if (reportKeywords.some(k => normalized.includes(k))) possibleIntent = 'LIVE_REPORT';
  if (safetyKeywords.some(k => normalized.includes(k))) possibleIntent = 'SAFETY_ALERT';
  if (fareKeywords.some(k => normalized.includes(k))) possibleIntent = 'FARE_CHECK';

  return { routeNumbers, locations, possibleIntent };
}

/**
 * Main agent pipeline: processes an inbound SMS end-to-end.
 *
 * @param {Object} inbound - Parsed inbound SMS { from, text, date, messageId }.
 * @returns {Promise<Object>} { smsReply, intent, confidence, processingTimeMs }
 */
export async function handleInboundSms(inbound) {
  const startTime = Date.now();
  const phoneHash = hashPhone(inbound.from);

  try {
    // ── Step 1: Extract hints for pre-fetching ──
    const hints = extractHints(inbound.text);

    // ── Step 2: Pre-fetch relevant context in parallel ──
    const contextPromises = [getActiveReports({ limit: 10 })];

    if (hints.routeNumbers.length > 0) {
      contextPromises.push(getRouteByNumber(hints.routeNumbers[0]));
    } else if (hints.locations.length >= 2) {
      contextPromises.push(findRoutes(hints.locations[0], hints.locations[1]));
    } else if (hints.locations.length === 1) {
      contextPromises.push(findRoutes(hints.locations[0], null));
    } else {
      contextPromises.push(Promise.resolve(null));
    }

    const [activeReports, routeContext] = await Promise.all(contextPromises);

    // ── Step 3: Send to Gemini 2.5 Pro ──
    const geminiResponse = await processWithGemini(
      inbound.text, activeReports, routeContext
    );

    // ── Step 4: Handle LIVE_REPORT — persist to Supabase ──
    if (geminiResponse.intent === 'LIVE_REPORT' && geminiResponse.report_data) {
      const rateLimited = await isRateLimited(phoneHash);
      if (rateLimited) {
        geminiResponse.sms_reply = 'Report limit reached. Try again in 5min. Asante!';
      } else {
        try {
          await insertReport({
            ...geminiResponse.report_data,
            reporter_phone: phoneHash,
            route_number: geminiResponse.entities?.route_number || null,
          });
        } catch (err) {
          console.error('[Agent] Failed to persist report:', err.message);
        }
      }
    }

    // ── Step 5: Log the interaction ──
    const processingTimeMs = Date.now() - startTime;
    await logMessage({
      phone_hash: phoneHash,
      inbound_sms: inbound.text,
      intent: geminiResponse.intent,
      confidence: geminiResponse.confidence,
      outbound_sms: geminiResponse.sms_reply,
      processing_time_ms: processingTimeMs,
      entities: geminiResponse.entities,
    }).catch(err => console.error('[Agent] Log error:', err.message));

    return {
      smsReply: geminiResponse.sms_reply,
      intent: geminiResponse.intent,
      confidence: geminiResponse.confidence,
      processingTimeMs,
      escalate: geminiResponse.escalate || false,
    };

  } catch (error) {
    console.error('[Agent] Pipeline error:', error.message);
    return {
      smsReply: 'Samahani, kuna tatizo la muda. Jaribu tena. SMS HELP.',
      intent: 'ERROR',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      escalate: false,
    };
  }
}

export default { handleInboundSms };
