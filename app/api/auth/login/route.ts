import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        {
          error: 'Email is required',
          code: 'MISSING_EMAIL',
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          error: 'Password is required',
          code: 'MISSING_PASSWORD',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT',
        },
        { status: 400 }
      );
    }

    // Normalize email to lowercase
    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (userRecords.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    const user = userRecords[0];

    // Compare provided password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    // Return user object without password field
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}