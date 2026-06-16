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

    // Get userId from request body
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

    // Check if user is registered for this drive
    const participant = await db
      .select()
      .from(driveParticipants)
      .where(
        and(
          eq(driveParticipants.driveId, parsedDriveId),
          eq(driveParticipants.userId, parsedUserId),
          eq(driveParticipants.status, 'registered')
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return NextResponse.json(
        {
          error: 'User is not registered for this drive',
          code: 'NOT_REGISTERED',
        },
        { status: 400 }
      );
    }

    // Update participant record status to 'cancelled'
    const updatedParticipant = await db
      .update(driveParticipants)
      .set({
        status: 'cancelled',
      })
      .where(eq(driveParticipants.id, participant[0].id))
      .returning();

    // Decrement currentParticipants count in cleanupDrives table
    const currentCount = drive[0].currentParticipants;
    const newCount = Math.max(0, currentCount - 1);

    const updatedDrive = await db
      .update(cleanupDrives)
      .set({
        currentParticipants: newCount,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cleanupDrives.id, parsedDriveId))
      .returning();

    return NextResponse.json(
      {
        message: 'Successfully left the cleanup drive',
        participant: updatedParticipant[0],
        drive: updatedDrive[0],
      },
      { status: 200 }
    );
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