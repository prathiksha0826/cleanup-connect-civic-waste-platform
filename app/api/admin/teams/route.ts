import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { municipalityTeams } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, serviceArea, wardNumbers, contactPhone, contactEmail } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({
        error: 'Name is required and must be a non-empty string',
        code: 'INVALID_NAME'
      }, { status: 400 });
    }

    if (!serviceArea || typeof serviceArea !== 'object') {
      return NextResponse.json({
        error: 'Service area is required and must be a valid object',
        code: 'INVALID_SERVICE_AREA'
      }, { status: 400 });
    }

    // Validate serviceArea structure
    if (typeof serviceArea.lat !== 'number' || typeof serviceArea.lng !== 'number') {
      return NextResponse.json({
        error: 'Service area must contain valid lat and lng coordinates',
        code: 'INVALID_SERVICE_AREA_COORDINATES'
      }, { status: 400 });
    }

    if (!serviceArea.radius && !serviceArea.polygon) {
      return NextResponse.json({
        error: 'Service area must contain either radius or polygon coordinates',
        code: 'INVALID_SERVICE_AREA_BOUNDS'
      }, { status: 400 });
    }

    if (!wardNumbers || !Array.isArray(wardNumbers) || wardNumbers.length === 0) {
      return NextResponse.json({
        error: 'Ward numbers is required and must be an array with at least one element',
        code: 'INVALID_WARD_NUMBERS'
      }, { status: 400 });
    }

    if (!contactEmail || typeof contactEmail !== 'string') {
      return NextResponse.json({
        error: 'Contact email is required',
        code: 'MISSING_CONTACT_EMAIL'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return NextResponse.json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT'
      }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedEmail = contactEmail.trim().toLowerCase();
    const sanitizedPhone = contactPhone ? contactPhone.trim() : null;

    // Prepare insert data
    const newTeam = await db.insert(municipalityTeams)
      .values({
        name: sanitizedName,
        serviceArea: serviceArea,
        wardNumbers: wardNumbers,
        contactPhone: sanitizedPhone,
        contactEmail: sanitizedEmail,
        status: 'active',
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newTeam[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse pagination parameters
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const statusParam = searchParams.get('status');
    const wardNumberParam = searchParams.get('wardNumber');

    // Validate limit
    let limit = 20;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return NextResponse.json({
          error: 'Limit must be a positive integer',
          code: 'INVALID_LIMIT'
        }, { status: 400 });
      }
      limit = Math.min(parsedLimit, 100);
    }

    // Validate offset
    let offset = 0;
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return NextResponse.json({
          error: 'Offset must be a non-negative integer',
          code: 'INVALID_OFFSET'
        }, { status: 400 });
      }
      offset = parsedOffset;
    }

    // Validate status
    if (statusParam && statusParam !== 'active' && statusParam !== 'inactive') {
      return NextResponse.json({
        error: 'Status must be either "active" or "inactive"',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    // Validate wardNumber
    let wardNumber: number | null = null;
    if (wardNumberParam) {
      const parsedWardNumber = parseInt(wardNumberParam);
      if (isNaN(parsedWardNumber)) {
        return NextResponse.json({
          error: 'Ward number must be an integer',
          code: 'INVALID_WARD_NUMBER'
        }, { status: 400 });
      }
      wardNumber = parsedWardNumber;
    }

    // Build query with filters
    let query = db.select().from(municipalityTeams);

    const conditions = [];

    if (statusParam) {
      conditions.push(eq(municipalityTeams.status, statusParam));
    }

    if (wardNumber !== null) {
      // Filter teams that have this ward number in their wardNumbers array
      // Using SQL LIKE to search within the JSON array
      conditions.push(
        sql`json_extract(${municipalityTeams.wardNumbers}, '$') LIKE ${'%' + wardNumber + '%'}`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order by createdAt DESC and apply pagination
    const results = await query
      .orderBy(desc(municipalityTeams.createdAt))
      .limit(limit)
      .offset(offset);

    // Additional filtering for wardNumber if needed (to ensure exact match in array)
    let filteredResults = results;
    if (wardNumber !== null) {
      filteredResults = results.filter(team => {
        const wardNumbers = team.wardNumbers as number[];
        return wardNumbers.includes(wardNumber);
      });
    }

    return NextResponse.json(filteredResults, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}