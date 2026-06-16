import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { driveParticipants, cleanupDrives, users } from '@/db/schema';
import { eq, or, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);

    // Validate userId
    const userIdNum = parseInt(userId);
    if (!userId || isNaN(userIdNum)) {
      return NextResponse.json(
        { 
          error: 'Valid user ID is required',
          code: 'INVALID_USER_ID' 
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const userExists = await db.select()
      .from(users)
      .where(eq(users.id, userIdNum))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const type = searchParams.get('type'); // 'joined', 'created', or null for both

    // Validate type parameter
    if (type && type !== 'joined' && type !== 'created') {
      return NextResponse.json(
        { 
          error: 'Invalid type parameter. Must be "joined" or "created"',
          code: 'INVALID_TYPE_PARAMETER' 
        },
        { status: 400 }
      );
    }

    let allDrives: any[] = [];

    // Fetch joined drives
    if (!type || type === 'joined') {
      const joinedDrives = await db.select({
        driveId: cleanupDrives.id,
        organizationId: cleanupDrives.organizationId,
        title: cleanupDrives.title,
        description: cleanupDrives.description,
        location: cleanupDrives.location,
        scheduledDate: cleanupDrives.scheduledDate,
        durationHours: cleanupDrives.durationHours,
        maxParticipants: cleanupDrives.maxParticipants,
        currentParticipants: cleanupDrives.currentParticipants,
        status: cleanupDrives.status,
        createdByUserId: cleanupDrives.createdByUserId,
        createdAt: cleanupDrives.createdAt,
        updatedAt: cleanupDrives.updatedAt,
        participantStatus: driveParticipants.status,
        joinedAt: driveParticipants.joinedAt,
      })
        .from(driveParticipants)
        .innerJoin(cleanupDrives, eq(driveParticipants.driveId, cleanupDrives.id))
        .where(eq(driveParticipants.userId, userIdNum));

      allDrives = allDrives.concat(
        joinedDrives.map(drive => ({
          id: drive.driveId,
          organizationId: drive.organizationId,
          title: drive.title,
          description: drive.description,
          location: drive.location,
          scheduledDate: drive.scheduledDate,
          durationHours: drive.durationHours,
          maxParticipants: drive.maxParticipants,
          currentParticipants: drive.currentParticipants,
          status: drive.status,
          createdByUserId: drive.createdByUserId,
          createdAt: drive.createdAt,
          updatedAt: drive.updatedAt,
          participantStatus: drive.participantStatus,
          joinedAt: drive.joinedAt,
          participationType: 'joined',
        }))
      );
    }

    // Fetch created drives
    if (!type || type === 'created') {
      const createdDrives = await db.select()
        .from(cleanupDrives)
        .where(eq(cleanupDrives.createdByUserId, userIdNum));

      allDrives = allDrives.concat(
        createdDrives.map(drive => ({
          id: drive.id,
          organizationId: drive.organizationId,
          title: drive.title,
          description: drive.description,
          location: drive.location,
          scheduledDate: drive.scheduledDate,
          durationHours: drive.durationHours,
          maxParticipants: drive.maxParticipants,
          currentParticipants: drive.currentParticipants,
          status: drive.status,
          createdByUserId: drive.createdByUserId,
          createdAt: drive.createdAt,
          updatedAt: drive.updatedAt,
          participantStatus: null,
          joinedAt: null,
          participationType: 'created',
        }))
      );
    }

    // Sort by scheduledDate descending
    allDrives.sort((a, b) => {
      const dateA = new Date(a.scheduledDate).getTime();
      const dateB = new Date(b.scheduledDate).getTime();
      return dateB - dateA;
    });

    // Apply pagination
    const paginatedDrives = allDrives.slice(offset, offset + limit);

    return NextResponse.json(paginatedDrives, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}