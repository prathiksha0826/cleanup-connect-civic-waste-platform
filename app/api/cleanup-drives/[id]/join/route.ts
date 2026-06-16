import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { driveParticipants, cleanupDrives } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driveId = params.id;

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

    // Parse request body
    const body = await request.json();
    const { userId } = body;

    // Validate userId
    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required',
          code: 'MISSING_USER_ID',
        },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(userId))) {
      return NextResponse.json(
        {
          error: 'Valid user ID is required',
          code: 'INVALID_USER_ID',
        },
        { status: 400 }
      );
    }

    const parsedUserId = parseInt(userId);

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

    const driveRecord = drive[0];

    // Check if drive is at max capacity
    if (
      driveRecord.maxParticipants !== null &&
      driveRecord.currentParticipants >= driveRecord.maxParticipants
    ) {
      return NextResponse.json(
        {
          error: 'Drive is at maximum capacity',
          code: 'DRIVE_AT_CAPACITY',
        },
        { status: 400 }
      );
    }

    // Check if user is already registered for this drive
    const existingParticipant = await db
      .select()
      .from(driveParticipants)
      .where(
        and(
          eq(driveParticipants.driveId, parsedDriveId),
          eq(driveParticipants.userId, parsedUserId)
        )
      )
      .limit(1);

    if (existingParticipant.length > 0) {
      return NextResponse.json(
        {
          error: 'User is already registered for this drive',
          code: 'ALREADY_REGISTERED',
        },
        { status: 400 }
      );
    }

    // Create new participant record
    const newParticipant = await db
      .insert(driveParticipants)
      .values({
        driveId: parsedDriveId,
        userId: parsedUserId,
        status: 'registered',
        joinedAt: new Date().toISOString(),
      })
      .returning();

    // Increment currentParticipants count
    await db
      .update(cleanupDrives)
      .set({
        currentParticipants: driveRecord.currentParticipants + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cleanupDrives.id, parsedDriveId));

    return NextResponse.json(newParticipant[0], { status: 201 });
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