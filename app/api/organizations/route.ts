import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations, users } from '@/db/schema';
import { eq, like, and, desc } from 'drizzle-orm';

const VALID_TYPES = ['ngo', 'school', 'citizen_group'] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, description, contactEmail, contactPhone, createdByUserId } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Type is required', code: 'MISSING_TYPE' },
        { status: 400 }
      );
    }

    if (!contactEmail) {
      return NextResponse.json(
        { error: 'Contact email is required', code: 'MISSING_CONTACT_EMAIL' },
        { status: 400 }
      );
    }

    if (!createdByUserId) {
      return NextResponse.json(
        { error: 'Created by user ID is required', code: 'MISSING_CREATED_BY_USER_ID' },
        { status: 400 }
      );
    }

    // Validate type is one of the allowed values
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { 
          error: `Type must be one of: ${VALID_TYPES.join(', ')}`, 
          code: 'INVALID_TYPE' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(contactEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL_FORMAT' },
        { status: 400 }
      );
    }

    // Validate createdByUserId is a valid integer
    const userIdInt = parseInt(createdByUserId);
    if (isNaN(userIdInt)) {
      return NextResponse.json(
        { error: 'Created by user ID must be a valid integer', code: 'INVALID_USER_ID' },
        { status: 400 }
      );
    }

    // Verify user exists
    const userExists = await db.select()
      .from(users)
      .where(eq(users.id, userIdInt))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json(
        { error: 'User does not exist', code: 'USER_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedEmail = contactEmail.trim().toLowerCase();
    const sanitizedPhone = contactPhone ? contactPhone.trim() : null;
    const sanitizedDescription = description ? description.trim() : null;

    // Create organization
    const newOrganization = await db.insert(organizations)
      .values({
        name: sanitizedName,
        type,
        description: sanitizedDescription,
        contactEmail: sanitizedEmail,
        contactPhone: sanitizedPhone,
        createdByUserId: userIdInt,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newOrganization[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    
    // Validate pagination parameters
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: 'Invalid limit parameter', code: 'INVALID_LIMIT' },
        { status: 400 }
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid offset parameter', code: 'INVALID_OFFSET' },
        { status: 400 }
      );
    }

    // Parse filter parameters
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const createdBy = searchParams.get('createdBy');

    // Validate type filter if provided
    if (type && !VALID_TYPES.includes(type as any)) {
      return NextResponse.json(
        { 
          error: `Type must be one of: ${VALID_TYPES.join(', ')}`, 
          code: 'INVALID_TYPE_FILTER' 
        },
        { status: 400 }
      );
    }

    // Validate createdBy filter if provided
    if (createdBy) {
      const createdByInt = parseInt(createdBy);
      if (isNaN(createdByInt)) {
        return NextResponse.json(
          { error: 'createdBy must be a valid integer', code: 'INVALID_CREATED_BY' },
          { status: 400 }
        );
      }
    }

    // Build query with filters
    let query = db.select().from(organizations);
    
    const conditions = [];

    if (type) {
      conditions.push(eq(organizations.type, type));
    }

    if (search) {
      conditions.push(like(organizations.name, `%${search}%`));
    }

    if (createdBy) {
      conditions.push(eq(organizations.createdByUserId, parseInt(createdBy)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(organizations.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}