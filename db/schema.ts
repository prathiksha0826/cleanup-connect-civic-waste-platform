import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'citizen', 'municipality', 'super-admin', 'municipality-worker'
  municipalityName: text('municipality_name'),
  municipalityLocation: text('municipality_location', { mode: 'json' }), // {lat, lng}
  adminCode: text('admin_code'), // special authentication code for super-admin
  teamId: integer('team_id').references(() => municipalityTeams.id),
  points: integer('points').notNull().default(0),
  badges: text('badges', { mode: 'json' }).notNull().default('[]'), // array of strings
  createdAt: text('created_at').notNull(),
});

// Municipality Teams table
export const municipalityTeams = sqliteTable('municipality_teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  serviceArea: text('service_area', { mode: 'json' }).notNull(), // {lat, lng, radius} or polygon coordinates
  wardNumbers: text('ward_numbers', { mode: 'json' }).notNull(), // array of ward numbers
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email').notNull(),
  status: text('status').notNull().default('active'), // 'active' or 'inactive'
  createdAt: text('created_at').notNull(),
});

// Reports table
export const reports = sqliteTable('reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  photoUrl: text('photo_url').notNull(),
  location: text('location', { mode: 'json' }).notNull(),
  wasteType: text('waste_type').notNull(),
  biodegradable: text('biodegradable').notNull(),
  severity: text('severity').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'assigned', 'in_progress', 'resolved', 'rejected'
  assignedTo: integer('assigned_to').references(() => users.id),
  assignedMunicipality: text('assigned_municipality'),
  assignedTeamId: integer('assigned_team_id').references(() => municipalityTeams.id),
  assignedBy: integer('assigned_by').references(() => users.id),
  assignmentDate: text('assignment_date'),
  wardNumber: integer('ward_number'),
  estimatedWeight: real('estimated_weight'), // in kilograms
  priorityScore: integer('priority_score').notNull(),
  carbonFootprintKg: real('carbon_footprint_kg'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  resolvedAt: text('resolved_at'),
});

// Contributions table
export const contributions = sqliteTable('contributions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  reportId: integer('report_id').references(() => reports.id),
  actionType: text('action_type').notNull(), // 'report_created', 'report_resolved', 'community_cleanup'
  pointsEarned: integer('points_earned').notNull(),
  createdAt: text('created_at').notNull(),
});

// Organizations table
export const organizations = sqliteTable('organizations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'ngo', 'school', 'citizen_group'
  description: text('description'),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone'),
  createdByUserId: integer('created_by_user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
});

// Cleanup drives table
export const cleanupDrives = sqliteTable('cleanup_drives', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organizationId: integer('organization_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  location: text('location', { mode: 'json' }).notNull(), // {lat, lng, address}
  scheduledDate: text('scheduled_date').notNull(),
  durationHours: integer('duration_hours'),
  maxParticipants: integer('max_participants'),
  currentParticipants: integer('current_participants').notNull().default(0),
  status: text('status').notNull().default('upcoming'), // 'upcoming', 'ongoing', 'completed', 'cancelled'
  createdByUserId: integer('created_by_user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Drive participants table
export const driveParticipants = sqliteTable('drive_participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  driveId: integer('drive_id').notNull().references(() => cleanupDrives.id),
  userId: integer('user_id').notNull().references(() => users.id),
  status: text('status').notNull().default('registered'), // 'registered', 'attended', 'cancelled'
  joinedAt: text('joined_at').notNull(),
});