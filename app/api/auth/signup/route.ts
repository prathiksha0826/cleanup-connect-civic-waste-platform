import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, municipalityName, municipalityLocation } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({ 
        error: "Email is required",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ 
        error: "Password is required",
        code: "MISSING_PASSWORD" 
      }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ 
        error: "Role is required",
        code: "MISSING_ROLE" 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL" 
      }, { status: 400 });
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json({ 
        error: "Password must be at least 8 characters long",
        code: "PASSWORD_TOO_SHORT" 
      }, { status: 400 });
    }

    // Validate role
    if (role !== 'citizen' && role !== 'municipality') {
      return NextResponse.json({ 
        error: "Role must be either 'citizen' or 'municipality'",
        code: "INVALID_ROLE" 
      }, { status: 400 });
    }

    // Validate municipality-specific fields
    if (role === 'municipality' && !municipalityName) {
      return NextResponse.json({ 
        error: "Municipality name is required for municipality role",
        code: "MISSING_MUNICIPALITY_NAME" 
      }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: "Email already exists",
        code: "EMAIL_EXISTS" 
      }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user data
    const userData: any = {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      role,
      points: 0,
      badges: JSON.stringify([]),
      createdAt: new Date().toISOString()
    };

    // Add municipality-specific fields if role is municipality
    if (role === 'municipality') {
      userData.municipalityName = municipalityName.trim();
      if (municipalityLocation) {
        userData.municipalityLocation = JSON.stringify(municipalityLocation);
      }
    }

    // Insert user into database
    const newUser = await db.insert(users)
      .values(userData)
      .returning();

    if (newUser.length === 0) {
      return NextResponse.json({ 
        error: "Failed to create user",
        code: "USER_CREATION_FAILED" 
      }, { status: 500 });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser[0];

    // Parse JSON fields for response
    const responseUser = {
      ...userWithoutPassword,
      badges: JSON.parse(userWithoutPassword.badges || '[]'),
      municipalityLocation: userWithoutPassword.municipalityLocation 
        ? JSON.parse(userWithoutPassword.municipalityLocation) 
        : null
    };

    return NextResponse.json(responseUser, { status: 201 });

  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}