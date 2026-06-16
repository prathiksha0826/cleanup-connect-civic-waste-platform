import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, adminCode } = body;

    // Validate required fields
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Valid email is required', code: 'MISSING_EMAIL' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters', code: 'INVALID_PASSWORD' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (!role || typeof role !== 'string' || !role.trim()) {
      return NextResponse.json(
        { error: 'Role is required', code: 'MISSING_ROLE' },
        { status: 400 }
      );
    }

    const validRoles = ['citizen', 'municipality', 'super-admin', 'municipality-worker'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${validRoles.join(', ')}`, code: 'INVALID_ROLE' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedName = name.trim();
    const sanitizedRole = role.trim();
    const sanitizedAdminCode = adminCode ? adminCode.trim() : null;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, sanitizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      // Update existing user
      const updated = await db
        .update(users)
        .set({
          password: hashedPassword,
          name: sanitizedName,
          role: sanitizedRole,
          adminCode: sanitizedAdminCode,
          points: 0,
        })
        .where(eq(users.email, sanitizedEmail))
        .returning();

      if (updated.length === 0) {
        return NextResponse.json(
          { error: 'Failed to update user', code: 'UPDATE_FAILED' },
          { status: 500 }
        );
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updated[0];

      return NextResponse.json(userWithoutPassword, { status: 200 });
    } else {
      // Create new user
      const newUser = await db
        .insert(users)
        .values({
          email: sanitizedEmail,
          password: hashedPassword,
          name: sanitizedName,
          role: sanitizedRole,
          adminCode: sanitizedAdminCode,
          points: 0,
          badges: '[]',
          createdAt: new Date().toISOString(),
        })
        .returning();

      if (newUser.length === 0) {
        return NextResponse.json(
          { error: 'Failed to create user', code: 'CREATE_FAILED' },
          { status: 500 }
        );
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser[0];

      return NextResponse.json(userWithoutPassword, { status: 201 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}