/**
 * Seed Script — Populates the Supabase routes table with Nairobi matatu route data.
 * Run: npm run seed
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const ROUTES = [
  // ─── WESTLANDS & WESTERN SUBURBS ───
  { route_number: '46', route_name: 'CBD–Kawangware via Valley Rd', boarding_stages: ['Kencom','Railways'], key_stops: ['Yaya','Precious Blood','Kawangware'], terminus: 'Kawangware', major_road: 'Valley Road/Argwings Kodhek', fare_range_low: 50, fare_range_high: 100, region: 'westlands' },
  { route_number: '105', route_name: 'CBD–Kikuyu via Waiyaki Way', boarding_stages: ['Odeon','Railways','Kencom'], key_stops: ['Westlands','Kangemi','Uthiru','Kikuyu'], terminus: 'Kikuyu', major_road: 'Waiyaki Way', fare_range_low: 80, fare_range_high: 150, region: 'westlands' },
  { route_number: '106', route_name: 'CBD–Banana via Village Market', boarding_stages: ['Odeon','Kencom'], key_stops: ['Westlands','Village Market','Ruaka','Banana'], terminus: 'Banana', major_road: 'Limuru Road', fare_range_low: 70, fare_range_high: 130, region: 'westlands' },
  { route_number: '118', route_name: 'CBD–Westlands via Parklands', boarding_stages: ['Odeon','Khoja'], key_stops: ['Parklands','Westlands','Sarit Centre','Westgate'], terminus: 'Westlands', major_road: 'Uhuru Highway/Waiyaki Way', fare_range_low: 40, fare_range_high: 80, region: 'westlands' },

  // ─── EASTLANDS & KANGUNDO RD ───
  { route_number: '120', route_name: 'CBD–Ruai via Kangundo Rd', boarding_stages: ['OTC','Haile Selassie'], key_stops: ['Donholm','Umoja','Kamulu','Ruai'], terminus: 'Ruai', major_road: 'Kangundo Road', fare_range_low: 100, fare_range_high: 200, region: 'eastlands' },
  { route_number: '6', route_name: 'CBD–Pangani via Eastleigh', boarding_stages: ['OTC','Ronald Ngala'], key_stops: ['Pangani','Eastleigh'], terminus: 'Eastleigh', major_road: 'Juja Road', fare_range_low: 30, fare_range_high: 60, region: 'eastlands' },
  { route_number: '9', route_name: 'CBD–Eastleigh via Ngara', boarding_stages: ['OTC','Ronald Ngala'], key_stops: ['Ngara','Eastleigh'], terminus: 'Eastleigh', major_road: 'Murang\'a Road', fare_range_low: 30, fare_range_high: 60, region: 'eastlands' },
  { route_number: '34', route_name: 'CBD–Embakasi via Jogoo Road', boarding_stages: ['OTC','Haile Selassie'], key_stops: ['Jogoo Road','Donholm','Embakasi','Fedha'], terminus: 'Embakasi', major_road: 'Jogoo Road', fare_range_low: 50, fare_range_high: 100, region: 'eastlands' },
  { route_number: '35', route_name: 'CBD–Umoja', boarding_stages: ['OTC','Haile Selassie'], key_stops: ['Jogoo Road','Donholm','Umoja I','Umoja II'], terminus: 'Umoja', major_road: 'Jogoo Road/Kangundo Rd', fare_range_low: 50, fare_range_high: 100, region: 'eastlands' },
  { route_number: '60', route_name: 'CBD–Umoja (all phases)', boarding_stages: ['OTC'], key_stops: ['Buruburu','Umoja','Kayole'], terminus: 'Kayole', major_road: 'Jogoo Road', fare_range_low: 50, fare_range_high: 100, region: 'eastlands' },

  // ─── NORTH ───
  { route_number: '44', route_name: 'CBD–Roysambu via Kasarani', boarding_stages: ['Ronald Ngala','Imenti'], key_stops: ['Kasarani','Zimmerman','Roysambu'], terminus: 'Roysambu', major_road: 'Thika Road', fare_range_low: 50, fare_range_high: 100, region: 'north' },
  { route_number: '45', route_name: 'CBD–Githurai/Ruiru via Thika Road', boarding_stages: ['Tom Mboya','Ronald Ngala'], key_stops: ['Pangani','Muthaiga','Githurai','Ruiru'], terminus: 'Ruiru', major_road: 'Thika Superhighway', fare_range_low: 80, fare_range_high: 200, region: 'north' },
  { route_number: '237', route_name: 'CBD–Kahawa via Roysambu', boarding_stages: ['Ronald Ngala'], key_stops: ['Roysambu','Kahawa West','Kahawa'], terminus: 'Kahawa', major_road: 'Thika Road', fare_range_low: 60, fare_range_high: 120, region: 'north' },

  // ─── SOUTH & LANG'ATA ───
  { route_number: '24', route_name: 'CBD–Karen via Ngong Road', boarding_stages: ['Kencom','Railways'], key_stops: ['Ngong Road','Dagoretti','Karen'], terminus: 'Karen', major_road: 'Ngong Road', fare_range_low: 60, fare_range_high: 120, region: 'south' },
  { route_number: '33', route_name: 'CBD–Nairobi West via South B/C', boarding_stages: ['Railways'], key_stops: ['South B','South C','Nairobi West'], terminus: 'Nairobi West', major_road: 'Mombasa Road/Langata Rd', fare_range_low: 40, fare_range_high: 80, region: 'south' },
  { route_number: '111', route_name: 'CBD–Rongai via Lang\'ata', boarding_stages: ['Railways','Kencom'], key_stops: ['Lang\'ata','Ongata Rongai'], terminus: 'Rongai', major_road: 'Langata Road/Magadi Rd', fare_range_low: 80, fare_range_high: 200, region: 'south' },
  { route_number: '125', route_name: 'CBD–Athi River via JKIA', boarding_stages: ['Railways'], key_stops: ['South B','JKIA','Mlolongo','Athi River'], terminus: 'Athi River', major_road: 'Mombasa Road', fare_range_low: 100, fare_range_high: 250, region: 'south' },
];

async function seed() {
  console.log('🌱 Seeding matatu routes...\n');

  for (const route of ROUTES) {
    const { data, error } = await supabase
      .from('routes')
      .upsert(route, { onConflict: 'route_number' })
      .select();

    if (error) {
      console.error(`  ❌ Route ${route.route_number}: ${error.message}`);
    } else {
      console.log(`  ✅ Route ${route.route_number}: ${route.route_name}`);
    }
  }

  console.log(`\n🏁 Seeded ${ROUTES.length} routes.`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
