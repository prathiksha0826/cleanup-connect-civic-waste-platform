import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { driveParticipants, cleanupDrives, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: driveId } = await params;
    const { searchParams } = new URL(request.url);

    // Validate driveId
    if (!driveId || isNaN(parseInt(driveId))) {
      return NextResponse.json(
        {
          error: 'Valid drive ID is required',
          code: 'INVALID_DRIVE_ID',
        },
        { status: 400 }
      );
    }

    const parsedDriveId = parseInt(driveId);

    // Check if drive exists
    const drive = await db
      .select()
      .from(cleanupDrives)
      .where(eq(cleanupDrives.id, parsedDriveId))
      .limit(1);

    if (drive.length === 0) {
      return NextResponse.json(
        {
          error: 'Cleanup drive not found',
          code: 'DRIVE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Parse query parameters
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const statusParam = searchParams.get('status');

    const limit = limitParam
      ? Math.min(parseInt(limitParam), 100)
      : 50;
    const offset = offsetParam ? parseInt(offsetParam) : 0;

    // Validate limit and offset
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        {
          error: 'Invalid limit parameter',
          code: 'INVALID_LIMIT',
        },
        { status: 400 }
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        {
          error: 'Invalid offset parameter',
          code: 'INVALID_OFFSET',
        },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ['registered', 'attended', 'cancelled'];
    if (statusParam && !validStatuses.includes(statusParam)) {
      return NextResponse.json(
        {
          error: 'Invalid status parameter. Must be one of: registered, attended, cancelled',
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    // Build query with join
    const conditions = [eq(driveParticipants.driveId, parsedDriveId)];
    
    // Apply status filter if provided
    if (statusParam) {
      conditions.push(eq(driveParticipants.status, statusParam));
    }

    // Execute query with pagination
    const participants = await db
      .select({
        id: driveParticipants.id,
        userId: driveParticipants.userId,
        userName: users.name,
        userEmail: users.email,
        status: driveParticipants.status,
        joinedAt: driveParticipants.joinedAt,
      })
      .from(driveParticipants)
      .innerJoin(users, eq(driveParticipants.userId, users.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(limit)
      .offset(offset);

    return NextResponse.json(participants, { status: 200 });
  } catch (error) {
    console.error('GET participants error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}