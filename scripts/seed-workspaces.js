/**
 * SpaceShare Database Seeding Script
 * Inserts 10 workspaces with complete data for testing host pages
 * 
 * Usage: node scripts/seed-workspace.js
 */

import dotenv from 'dotenv';
import pool from '../src/common/config/db.js';

dotenv.config();

// ================================================================
// SEED DATA
// ================================================================

const WORKSPACES = [
  {
    title: 'Premium Co-working Space in VI',
    description: 'A modern, fully-equipped co-working space in the heart of Victoria Island. Features high-speed internet, backup generator, air conditioning, and 24/7 security. Perfect for freelancers and small teams.',
    workspace_type: 'desk',
    capacity: 5,
    address: '123 Bishop Aboyade Cole Street, Victoria Island',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.4281,
    longitude: 3.4219,
    amenities: ['wifi', 'power_backup', 'air_conditioning', 'security', 'printer'],
    pricing: [
      { type: 'hourly', amount: 1500 },
      { type: 'daily', amount: 10000 },
      { type: 'weekly', amount: 60000 }
    ],
    availability: [
      { date: '2026-08-10', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-11', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-12', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-13', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-14', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-17', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-18', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-19', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-20', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-21', start: '09:00', end: '18:00', blocked: false },
    ]
  },
  {
    title: 'Executive Meeting Room - Ikoyi',
    description: 'Professional meeting room with state-of-the-art AV equipment, video conferencing capabilities, and comfortable seating for up to 12 people. Includes whiteboard and refreshments.',
    workspace_type: 'meeting_room',
    capacity: 12,
    address: '45 Awolowo Road, Ikoyi',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.4521,
    longitude: 3.4125,
    amenities: ['wifi', 'air_conditioning', 'whiteboard', 'security', 'power_backup'],
    pricing: [
      { type: 'hourly', amount: 5000 },
      { type: 'daily', amount: 35000 }
    ],
    availability: [
      { date: '2026-08-10', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-11', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-12', start: '08:00', end: '12:00', blocked: true },
      { date: '2026-08-12', start: '13:00', end: '20:00', blocked: false },
      { date: '2026-08-13', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-14', start: '08:00', end: '20:00', blocked: false },
    ]
  },
  {
    title: 'Private Office - Magodo Phase 2',
    description: 'Spacious private office with natural lighting, perfect for established professionals seeking a quiet workspace. Includes ergonomic furniture and soundproof walls.',
    workspace_type: 'private_office',
    capacity: 2,
    address: '7 Adebayo Street, Magodo Phase 2',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.6120,
    longitude: 3.4125,
    amenities: ['wifi', 'power_backup', 'air_conditioning', 'kitchen_access', 'security'],
    pricing: [
      { type: 'hourly', amount: 2500 },
      { type: 'daily', amount: 18000 },
      { type: 'weekly', amount: 120000 }
    ],
    availability: [
      { date: '2026-08-10', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-11', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-12', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-13', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-14', start: '09:00', end: '18:00', blocked: false },
    ]
  },
  {
    title: 'Training Room - Surulere',
    description: 'Large training room with projector, whiteboards, and flexible seating for up to 30 participants. Ideal for workshops, corporate training, and seminars.',
    workspace_type: 'training_room',
    capacity: 30,
    address: '12 Bode Thomas Street, Surulere',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.5015,
    longitude: 3.3515,
    amenities: ['wifi', 'whiteboard', 'air_conditioning', 'power_backup', 'printer'],
    pricing: [
      { type: 'hourly', amount: 7000 },
      { type: 'daily', amount: 50000 },
      { type: 'weekly', amount: 250000 }
    ],
    availability: [
      { date: '2026-08-10', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-11', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-12', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-13', start: '08:00', end: '20:00', blocked: true },
      { date: '2026-08-14', start: '08:00', end: '20:00', blocked: false },
    ]
  },
  {
    title: 'Podcast Studio - Lekki Phase 1',
    description: 'Professional podcast recording studio with soundproofing, professional microphones, audio interface, and acoustic treatment. Includes editing and mixing services.',
    workspace_type: 'podcast_studio',
    capacity: 4,
    address: '22 Ogunlana Drive, Lekki Phase 1',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.4484,
    longitude: 3.4570,
    amenities: ['wifi', 'power_backup', 'air_conditioning', 'security', 'standing_desk'],
    pricing: [
      { type: 'hourly', amount: 8000 },
      { type: 'daily', amount: 55000 },
      { type: 'weekly', amount: 300000 }
    ],
    availability: [
      { date: '2026-08-10', start: '10:00', end: '22:00', blocked: false },
      { date: '2026-08-11', start: '10:00', end: '22:00', blocked: false },
      { date: '2026-08-12', start: '10:00', end: '22:00', blocked: false },
      { date: '2026-08-13', start: '10:00', end: '22:00', blocked: false },
      { date: '2026-08-14', start: '10:00', end: '22:00', blocked: false },
    ]
  },
  {
    title: 'Creative Space - Yaba',
    description: 'Inspirational creative space with natural lighting, high ceilings, and collaborative layout. Perfect for designers, artists, and creative teams. Includes large work tables and presentation wall.',
    workspace_type: 'creative_space',
    capacity: 8,
    address: '8 Herbert Macaulay Road, Yaba',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.5055,
    longitude: 3.3610,
    amenities: ['wifi', 'power_backup', 'air_conditioning', 'whiteboard', 'kitchen_access'],
    pricing: [
      { type: 'hourly', amount: 3000 },
      { type: 'daily', amount: 22000 },
      { type: 'weekly', amount: 140000 }
    ],
    availability: [
      { date: '2026-08-10', start: '09:00', end: '19:00', blocked: false },
      { date: '2026-08-11', start: '09:00', end: '19:00', blocked: false },
      { date: '2026-08-12', start: '09:00', end: '19:00', blocked: false },
      { date: '2026-08-13', start: '09:00', end: '19:00', blocked: false },
      { date: '2026-08-14', start: '09:00', end: '19:00', blocked: false },
      { date: '2026-08-17', start: '09:00', end: '19:00', blocked: false },
      { date: '2026-08-18', start: '09:00', end: '19:00', blocked: false },
      { date: '2026-08-19', start: '09:00', end: '19:00', blocked: false },
      { date: '2026-08-20', start: '09:00', end: '19:00', blocked: false },
      { date: '2026-08-21', start: '09:00', end: '19:00', blocked: false },
    ]
  },
  {
    title: 'Hot Desk - Ikeja',
    description: 'Flexible hot desk in a vibrant co-working community. Includes access to meeting rooms, event space, and networking opportunities. Perfect for digital nomads.',
    workspace_type: 'desk',
    capacity: 1,
    address: '35 Kodesoh Street, Ikeja',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.6020,
    longitude: 3.3510,
    amenities: ['wifi', 'power_backup', 'air_conditioning', 'security', 'kitchen_access'],
    pricing: [
      { type: 'hourly', amount: 1200 },
      { type: 'daily', amount: 8000 },
      { type: 'weekly', amount: 50000 }
    ],
    availability: [
      { date: '2026-08-10', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-11', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-12', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-13', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-14', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-17', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-18', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-19', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-20', start: '08:00', end: '20:00', blocked: false },
      { date: '2026-08-21', start: '08:00', end: '20:00', blocked: false },
    ]
  },
  {
    title: 'Conference Room - Gbagada',
    description: 'Premium conference room with top-tier AV equipment, video conferencing, and seating for 20. Ideal for board meetings, client presentations, and team off-sites.',
    workspace_type: 'meeting_room',
    capacity: 20,
    address: '9 Olu Ogunyemi Street, Gbagada',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.5550,
    longitude: 3.3800,
    amenities: ['wifi', 'air_conditioning', 'whiteboard', 'power_backup', 'security', 'printer'],
    pricing: [
      { type: 'hourly', amount: 6000 },
      { type: 'daily', amount: 42000 }
    ],
    availability: [
      { date: '2026-08-10', start: '09:00', end: '18:00', blocked: true },
      { date: '2026-08-11', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-12', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-13', start: '09:00', end: '18:00', blocked: false },
      { date: '2026-08-14', start: '09:00', end: '18:00', blocked: false },
    ]
  },
  {
    title: 'Quiet Private Office - Ajah',
    description: 'Peaceful private office in a serene environment, away from city noise. Features ergonomic furniture, soundproof walls, and a dedicated parking space.',
    workspace_type: 'private_office',
    capacity: 3,
    address: '15 Epe Expressway, Ajah',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.4685,
    longitude: 3.5570,
    amenities: ['wifi', 'power_backup', 'air_conditioning', 'security', 'parking'],
    pricing: [
      { type: 'hourly', amount: 2000 },
      { type: 'daily', amount: 15000 },
      { type: 'weekly', amount: 100000 }
    ],
    availability: [
      { date: '2026-08-10', start: '08:00', end: '18:00', blocked: false },
      { date: '2026-08-11', start: '08:00', end: '18:00', blocked: false },
      { date: '2026-08-12', start: '08:00', end: '18:00', blocked: false },
      { date: '2026-08-13', start: '08:00', end: '18:00', blocked: false },
      { date: '2026-08-14', start: '08:00', end: '18:00', blocked: false },
      { date: '2026-08-17', start: '08:00', end: '18:00', blocked: false },
      { date: '2026-08-18', start: '08:00', end: '18:00', blocked: false },
      { date: '2026-08-19', start: '08:00', end: '18:00', blocked: false },
      { date: '2026-08-20', start: '08:00', end: '18:00', blocked: false },
      { date: '2026-08-21', start: '08:00', end: '18:00', blocked: false },
    ]
  },
  {
    title: 'Art Studio & Creative Space - Lekki',
    description: 'Spacious art studio with natural lighting, high ceilings, and creative atmosphere. Includes easels, large work tables, and a dedicated gallery wall for exhibitions.',
    workspace_type: 'creative_space',
    capacity: 6,
    address: '3 Elegushi Road, Lekki',
    city: 'Lagos',
    state: 'Lagos',
    latitude: 6.4400,
    longitude: 3.4700,
    amenities: ['wifi', 'power_backup', 'air_conditioning', 'kitchen_access', 'standing_desk'],
    pricing: [
      { type: 'hourly', amount: 3500 },
      { type: 'daily', amount: 25000 },
      { type: 'weekly', amount: 160000 }
    ],
    availability: [
      { date: '2026-08-10', start: '10:00', end: '21:00', blocked: false },
      { date: '2026-08-11', start: '10:00', end: '21:00', blocked: false },
      { date: '2026-08-12', start: '10:00', end: '21:00', blocked: false },
      { date: '2026-08-13', start: '10:00', end: '21:00', blocked: false },
      { date: '2026-08-14', start: '10:00', end: '21:00', blocked: false },
      { date: '2026-08-17', start: '10:00', end: '21:00', blocked: false },
      { date: '2026-08-18', start: '10:00', end: '21:00', blocked: false },
      { date: '2026-08-19', start: '10:00', end: '21:00', blocked: false },
      { date: '2026-08-20', start: '10:00', end: '21:00', blocked: false },
      { date: '2026-08-21', start: '10:00', end: '21:00', blocked: false },
    ]
  }
];

// Sample photo URLs
const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800',
];

// ================================================================
// SEEDING FUNCTIONS
// ================================================================

// Cache the pricing column name to avoid repeated errors
let pricingTypeColumn = null;

/**
 * Detect the correct column name for pricing type
 */
async function detectPricingColumn(client) {
  if (pricingTypeColumn) return pricingTypeColumn;
  
  const result = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'workspace_pricing' 
    AND column_name IN ('pricing_type', 'price_type', 'type')
  `);
  
  if (result.rows.length > 0) {
    pricingTypeColumn = result.rows[0].column_name;
    console.log(`   ℹ️  Using pricing column: "${pricingTypeColumn}"`);
    return pricingTypeColumn;
  }
  
  // If no type column found, we'll insert without it
  pricingTypeColumn = 'none';
  return null;
}

/**
 * Get or create a test host user
 */
async function getOrCreateTestHost(client) {
  console.log('🔍 Checking for test host...');
  
  const existingHost = await client.query(`
    SELECT u.id, hp.id as host_profile_id
    FROM users u
    JOIN host_profiles hp ON hp.user_id = u.id
    WHERE u.role = 'host'
    LIMIT 1
  `);

  if (existingHost.rows.length > 0) {
    console.log(`✅ Found existing host: ${existingHost.rows[0].id}`);
    return {
      userId: existingHost.rows[0].id,
      hostProfileId: existingHost.rows[0].host_profile_id
    };
  }

  console.log('👤 Creating test host user...');
  
  const userResult = await client.query(`
    INSERT INTO users (full_name, email, password_hash, role, is_verified)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [
    'Test Host',
    'test.host@spaceshare.com',
    '$2b$12$WZkZqZqZqZqZqZqZqZqZqO',
    'host',
    true
  ]);

  const userId = userResult.rows[0].id;

  const profileResult = await client.query(`
    INSERT INTO host_profiles (user_id, verification_status)
    VALUES ($1, 'verified')
    RETURNING id
  `, [userId]);

  console.log(`✅ Created test host: ${userId}`);
  return {
    userId,
    hostProfileId: profileResult.rows[0].id
  };
}

/**
 * Insert a workspace with all related data
 */
async function insertWorkspace(client, hostId, workspaceData) {
  const {
    title,
    description,
    workspace_type,
    capacity,
    address,
    city,
    state,
    latitude,
    longitude,
    amenities,
    pricing,
    availability
  } = workspaceData;

  console.log(`  📝 Inserting workspace: "${title}"`);

  // Insert workspace
  const workspaceResult = await client.query(`
    INSERT INTO workspaces (
      host_id, title, description, workspace_type, capacity,
      address, city, state, latitude, longitude, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'published')
    RETURNING id
  `, [
    hostId, title, description, workspace_type, capacity,
    address, city, state, latitude, longitude
  ]);

  const workspaceId = workspaceResult.rows[0].id;
  console.log(`    ✅ Workspace created: ${workspaceId}`);

  // Insert amenities
  for (const amenity of amenities) {
    await client.query(`
      INSERT INTO workspace_amenities (workspace_id, amenity_name)
      VALUES ($1, $2)
      ON CONFLICT (workspace_id, amenity_name) DO NOTHING
    `, [workspaceId, amenity]);
  }
  console.log(`    ✅ Added ${amenities.length} amenities`);

  // Insert pricing - detect column name once
  const typeColumn = await detectPricingColumn(client);
  
  for (const price of pricing) {
    if (typeColumn && typeColumn !== 'none') {
      // Insert with type column
      await client.query(`
        INSERT INTO workspace_pricing (workspace_id, ${typeColumn}, amount, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (workspace_id, ${typeColumn}) DO UPDATE
        SET amount = EXCLUDED.amount, is_active = true
      `, [workspaceId, price.type, price.amount]);
    } else {
      // Insert without type column (just amount)
      await client.query(`
        INSERT INTO workspace_pricing (workspace_id, amount, is_active)
        VALUES ($1, $2, true)
      `, [workspaceId, price.amount]);
    }
  }
  console.log(`    ✅ Added ${pricing.length} pricing options`);

  // Insert availability
  if (availability && availability.length > 0) {
    for (const slot of availability) {
      await client.query(`
        INSERT INTO availability_calendars (workspace_id, date, start_time, end_time, is_blocked)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (workspace_id, date, start_time) DO UPDATE
        SET end_time = EXCLUDED.end_time, is_blocked = EXCLUDED.is_blocked
      `, [workspaceId, slot.date, slot.start, slot.end, slot.blocked]);
    }
    console.log(`    ✅ Added ${availability.length} availability slots`);
  }

  // Insert sample photos (3 per workspace)
  const photoIndex = workspaceId % SAMPLE_PHOTOS.length;
  const photos = [
    SAMPLE_PHOTOS[photoIndex % SAMPLE_PHOTOS.length],
    SAMPLE_PHOTOS[(photoIndex + 1) % SAMPLE_PHOTOS.length],
    SAMPLE_PHOTOS[(photoIndex + 2) % SAMPLE_PHOTOS.length],
  ];

  for (let i = 0; i < photos.length; i++) {
    await client.query(`
      INSERT INTO workspace_photos (workspace_id, photo_url, cloudinary_public_id, is_cover, display_order)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      workspaceId,
      photos[i],
      `sample_workspace_${workspaceId}_${i}`,
      i === 0,
      i
    ]);
  }
  console.log(`    ✅ Added 3 sample photos`);

  return workspaceId;
}

/**
 * Main seeding function
 */
async function seedWorkspaces() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('\n🚀 Starting workspace seeding...\n');

    // Detect pricing column first
    await detectPricingColumn(client);

    // Get or create test host
    const { userId, hostProfileId } = await getOrCreateTestHost(client);

    // Insert each workspace
    const workspaceIds = [];
    for (const workspaceData of WORKSPACES) {
      const id = await insertWorkspace(client, hostProfileId, workspaceData);
      workspaceIds.push(id);
    }

    await client.query('COMMIT');

    console.log('\n✨ Seeding completed successfully!');
    console.log(`📊 Created ${workspaceIds.length} workspaces`);
    console.log(`🔑 Host ID: ${userId}`);
    console.log(`📋 Host Profile ID: ${hostProfileId}\n`);
    console.log('You can now test your host pages with these workspaces!');

    return {
      hostId: userId,
      hostProfileId,
      workspaceIds
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// ================================================================
// RUN SEEDER
// ================================================================

seedWorkspaces()
  .then(() => {
    console.log('✅ Seeding script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding script failed:', error.message);
    process.exit(1);
  });