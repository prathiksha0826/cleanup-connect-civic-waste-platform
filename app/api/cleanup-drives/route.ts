import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cleanupDrives } from '@/db/schema';
import { eq, like, and, gte, lte, asc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      title,
      description,
      location,
      scheduledDate,
      durationHours,
      maxParticipants,
      status,
      createdByUserId
    } = body;

    // Validate required fields
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required', code: 'MISSING_ORGANIZATION_ID' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required', code: 'MISSING_TITLE' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json(
        { error: 'Description is required', code: 'MISSING_DESCRIPTION' },
        { status: 400 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { error: 'Location is required', code: 'MISSING_LOCATION' },
        { status: 400 }
      );
    }

    if (!scheduledDate || typeof scheduledDate !== 'string') {
      return NextResponse.json(
        { error: 'Scheduled date is required', code: 'MISSING_SCHEDULED_DATE' },
        { status: 400 }
      );
    }

    if (!createdByUserId) {
      return NextResponse.json(
        { error: 'Created by user ID is required', code: 'MISSING_CREATED_BY_USER_ID' },
        { status: 400 }
      );
    }

    // Validate organizationId is valid integer
    const orgId = parseInt(organizationId);
    if (isNaN(orgId) || orgId <= 0) {
      return NextResponse.json(
        { error: 'Organization ID must be a valid positive integer', code: 'INVALID_ORGANIZATION_ID' },
        { status: 400 }
      );
    }

    // Validate createdByUserId is valid integer
    const userId = parseInt(createdByUserId);
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { error: 'Created by user ID must be a valid positive integer', code: 'INVALID_CREATED_BY_USER_ID' },
        { status: 400 }
      );
    }

    // Validate location object
    if (typeof location !== 'object' || location === null) {
      return NextResponse.json(
        { error: 'Location must be an object', code: 'INVALID_LOCATION_FORMAT' },
        { status: 400 }
      );
    }

    if (!location.lat || !location.lng || !location.address) {
      return NextResponse.json(
        { error: 'Location must contain lat, lng, and address properties', code: 'INCOMPLETE_LOCATION' },
        { status: 400 }
      );
    }

    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return NextResponse.json(
        { error: 'Location lat and lng must be numbers', code: 'INVALID_LOCATION_COORDINATES' },
        { status: 400 }
      );
    }

    if (typeof location.address !== 'string' || location.address.trim() === '') {
      return NextResponse.json(
        { error: 'Location address must be a non-empty string', code: 'INVALID_LOCATION_ADDRESS' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}`, code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // Validate durationHours if provided
    if (durationHours !== undefined && durationHours !== null) {
      const duration = parseInt(durationHours);
      if (isNaN(duration) || duration <= 0) {
        return NextResponse.json(
          { error: 'Duration hours must be a positive integer', code: 'INVALID_DURATION_HOURS' },
          { status: 400 }
        );
      }
    }

    // Validate maxParticipants if provided
    if (maxParticipants !== undefined && maxParticipants !== null) {
      const maxPart = parseInt(maxParticipants);
      if (isNaN(maxPart) || maxPart <= 0) {
        return NextResponse.json(
          { error: 'Max participants must be a positive integer', code: 'INVALID_MAX_PARTICIPANTS' },
          { status: 400 }
        );
      }
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: any = {
      organizationId: orgId,
      title: title.trim(),
      description: description.trim(),
      location: JSON.stringify(location),
      scheduledDate: scheduledDate,
      currentParticipants: 0,
      status: status || 'upcoming',
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now
    };

    if (durationHours !== undefined && durationHours !== null) {
      insertData.durationHours = parseInt(durationHours);
    }

    if (maxParticipants !== undefined && maxParticipants !== null) {
      insertData.maxParticipants = parseInt(maxParticipants);
    }

    // Insert into database
    const newDrive = await db.insert(cleanupDrives)
      .values(insertData)
      .returning();

    return NextResponse.json(newDrive[0], { status: 201 });
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse pagination parameters
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 20;
    const offset = offsetParam ? parseInt(offsetParam) : 0;

    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json(
        { error: 'Limit must be a positive integer', code: 'INVALID_LIMIT' },
        { status: 400 }
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be a non-negative integer', code: 'INVALID_OFFSET' },
        { status: 400 }
      );
    }

    // Parse filter parameters
    const statusParam = searchParams.get('status');
    const organizationIdParam = searchParams.get('organizationId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const searchParam = searchParams.get('search');

    // Build where conditions
    const conditions: any[] = [];

    // Status filter
    if (statusParam) {
      const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
      if (!validStatuses.includes(statusParam)) {
        return NextResponse.json(
          { error: `Status must be one of: ${validStatuses.join(', ')}`, code: 'INVALID_STATUS_FILTER' },
          { status: 400 }
        );
      }
      conditions.push(eq(cleanupDrives.status, statusParam));
    }

    // Organization filter
    if (organizationIdParam) {
      const orgId = parseInt(organizationIdParam);
      if (isNaN(orgId) || orgId <= 0) {
        return NextResponse.json(
          { error: 'Organization ID must be a valid positive integer', code: 'INVALID_ORGANIZATION_ID_FILTER' },
          { status: 400 }
        );
      }
      conditions.push(eq(cleanupDrives.organizationId, orgId));
    }

    // Date range filter
    if (startDateParam) {
      conditions.push(gte(cleanupDrives.scheduledDate, startDateParam));
    }

    if (endDateParam) {
      conditions.push(lte(cleanupDrives.scheduledDate, endDateParam));
    }

    // Search filter
    if (searchParam) {
      conditions.push(like(cleanupDrives.title, `%${searchParam}%`));
    }

    // Build query
    let query = db.select().from(cleanupDrives);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Execute query with sorting, pagination
    const results = await query
      .orderBy(asc(cleanupDrives.scheduledDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}