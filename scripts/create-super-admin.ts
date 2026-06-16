import { db } from '@/db';
import { users } from '@/db/schema';
import bcrypt from 'bcrypt';

async function createSuperAdmin() {
  try {
    const email = 'admin@cleanup.com';
    const password = 'admin123';
    const adminCode = 'CLEANUP2024';
    const name = 'Super Administrator';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create super-admin user
    const result = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      role: 'super-admin',
      adminCode,
      points: 0,
      badges: JSON.stringify([]),
      createdAt: new Date().toISOString(),
    }).returning();

    console.log('✅ Super-admin account created successfully!');
    console.log('\n📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🛡️  Admin Code:', adminCode);
    console.log('\nYou can now login at: /admin/login');
    
    return result[0];
  } catch (error) {
    console.error('❌ Error creating super-admin:', error);
  }
}

createSuperAdmin();
