/**
 * Matatu Route Intelligence Agent — Supabase Service
 * Handles all database operations for routes, reports, and logging.
 */
import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey || config.supabase.anonKey
);

/** Searches routes matching origin/destination with fuzzy matching. */
export async function findRoutes(origin, destination) {
  let query = supabase.from('routes').select('*');
  if (origin) query = query.or(`boarding_stages.ilike.%${origin}%,key_stops.cs.{${origin}}`);
  if (destination) query = query.or(`terminus.ilike.%${destination}%,key_stops.cs.{${destination}},route_name.ilike.%${destination}%`);
  const { data, error } = await query.limit(5);
  if (error) { console.error('[Supabase] Route lookup error:', error.message); return []; }
  return data || [];
}

/** Retrieves a specific route by number. */
export async function getRouteByNumber(routeNumber) {
  const { data, error } = await supabase.from('routes').select('*').eq('route_number', String(routeNumber)).single();
  if (error) return null;
  return data;
}

/** Inserts a new crowd-sourced live report. */
export async function insertReport(report) {
  const { data, error } = await supabase.from('live_reports').insert({
    type: report.type, severity: report.severity, location_name: report.location_name,
    coordinates: report.coordinates || null, description: report.description,
    reporter_phone_hash: report.reporter_phone, route_number: report.route_number || null,
    expires_at: report.expires_at, verified: false, upvotes: 0,
  }).select().single();
  if (error) throw new Error('Failed to log report: ' + error.message);
  return data;
}

/** Gets all active (non-expired) live reports. */
export async function getActiveReports(filters = {}) {
  let query = supabase.from('live_reports').select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false }).limit(filters.limit || 20);
  if (filters.routeNumber) query = query.eq('route_number', filters.routeNumber);
  if (filters.location) query = query.ilike('location_name', `%${filters.location}%`);
  const { data, error } = await query;
  if (error) { console.error('[Supabase] Active reports error:', error.message); return []; }
  return data || [];
}

/** Upvotes an existing report (community verification). */
export async function upvoteReport(reportId) {
  const { data, error } = await supabase.rpc('increment_upvote', { report_id: reportId });
  if (error) return null;
  return data;
}

/** Logs an SMS interaction for analytics. */
export async function logMessage(entry) {
  const { error } = await supabase.from('message_log').insert({
    phone_hash: entry.phone_hash, inbound_sms: entry.inbound_sms,
    classified_intent: entry.intent, confidence: entry.confidence,
    outbound_sms: entry.outbound_sms, processing_time_ms: entry.processing_time_ms,
    entities: entry.entities || {},
  });
  if (error) console.error('[Supabase] Message log error:', error.message);
}

/** Checks if a phone number is within the report cooldown window. */
export async function isRateLimited(phoneHash) {
  const cooldownStart = new Date(Date.now() - config.sms.reportCooldownMs).toISOString();
  const { data } = await supabase.from('live_reports').select('id')
    .eq('reporter_phone_hash', phoneHash).gte('created_at', cooldownStart).limit(1);
  return data && data.length > 0;
}

/** Subscribes to real-time changes on live_reports table. */
export function subscribeToReports(callback) {
  return supabase.channel('live-reports-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_reports' },
      (payload) => callback(payload.eventType, payload.new || payload.old))
    .subscribe();
}

export { supabase };
export default supabase;
