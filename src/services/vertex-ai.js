/**
 * Matatu Route Intelligence Agent — Vertex AI Service
 * Interfaces with Gemini 2.5 Pro for intent classification & response generation.
 */
import { VertexAI } from '@google-cloud/vertexai';
import config from '../config/index.js';
import { SYSTEM_PROMPT, buildPromptParts } from '../config/system-prompt.js';

// ─── Initialize Vertex AI ───
const vertexAI = new VertexAI({
  project: config.gcp.projectId,
  location: config.gcp.location,
});

const generativeModel = vertexAI.getGenerativeModel({
  model: config.gcp.model,
  systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
  generationConfig: {
    temperature: 0.2,       // Low temp for factual, deterministic routing answers
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1024,  // We only need ~200 tokens max (JSON + 160-char SMS)
    responseMimeType: 'application/json', // Force structured JSON output
  },
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
  ],
});

/**
 * Processes an inbound SMS through Gemini 2.5 Pro.
 *
 * @param {string} smsText - Raw SMS from the commuter.
 * @param {Array} activeReports - Current live reports from Supabase.
 * @param {Object|null} routeContext - Pre-fetched route data (if any).
 * @returns {Promise<Object>} Parsed JSON response from Gemini.
 */
export async function processWithGemini(smsText, activeReports = [], routeContext = null) {
  const startTime = Date.now();

  try {
    const promptParts = buildPromptParts(smsText, activeReports, routeContext);

    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: promptParts }],
    });

    const response = result.response;
    const textContent = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('Empty response from Gemini');
    }

    // Parse the JSON response
    const parsed = JSON.parse(textContent);
    parsed._processing_time_ms = Date.now() - startTime;

    // Enforce 160-character limit on sms_reply
    if (parsed.sms_reply && parsed.sms_reply.length > 160) {
      parsed.sms_reply = parsed.sms_reply.substring(0, 157) + '...';
      parsed._truncated = true;
    }

    return parsed;

  } catch (error) {
    console.error('[VertexAI] Gemini processing error:', error.message);

    // Fallback response
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      entities: {},
      sms_reply: 'Samahani, kuna tatizo. Jaribu tena baadaye. SMS "HELP" for options.',
      _error: error.message,
      _processing_time_ms: Date.now() - startTime,
    };
  }
}

/**
 * Streams a Gemini response (for dashboard/monitoring use).
 *
 * @param {string} smsText - Raw SMS text.
 * @param {Array} activeReports - Active reports context.
 * @param {Function} onChunk - Callback for each streamed chunk.
 * @returns {Promise<string>} Full accumulated response.
 */
export async function streamWithGemini(smsText, activeReports = [], onChunk = () => {}) {
  const promptParts = buildPromptParts(smsText, activeReports);

  const streamResult = await generativeModel.generateContentStream({
    contents: [{ role: 'user', parts: promptParts }],
  });

  let fullText = '';
  for await (const chunk of streamResult.stream) {
    const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
    fullText += chunkText;
    onChunk(chunkText);
  }

  return fullText;
}

export default { processWithGemini, streamWithGemini };
