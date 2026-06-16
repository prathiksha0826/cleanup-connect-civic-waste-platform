import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cleanupDrives } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const driveId = parseInt(id);

    const drive = await db
      .select()
      .from(cleanupDrives)
      .where(eq(cleanupDrives.id, driveId))
      .limit(1);

    if (drive.length === 0) {
      return NextResponse.json(
        { error: 'Cleanup drive not found', code: 'DRIVE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(drive[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const driveId = parseInt(id);

    const existingDrive = await db
      .select()
      .from(cleanupDrives)
      .where(eq(cleanupDrives.id, driveId))
      .limit(1);

    if (existingDrive.length === 0) {
      return NextResponse.json(
        { error: 'Cleanup drive not found', code: 'DRIVE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      status,
      title,
      description,
      scheduledDate,
      durationHours,
      maxParticipants,
      location,
    } = body;

    const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    if (durationHours !== undefined) {
      const duration = parseInt(durationHours);
      if (isNaN(duration) || duration <= 0) {
        return NextResponse.json(
          {
            error: 'Duration hours must be a positive integer',
            code: 'INVALID_DURATION',
          },
          { status: 400 }
        );
      }
    }

    if (maxParticipants !== undefined) {
      const max = parseInt(maxParticipants);
      if (isNaN(max) || max <= 0) {
        return NextResponse.json(
          {
            error: 'Max participants must be a positive integer',
            code: 'INVALID_MAX_PARTICIPANTS',
          },
          { status: 400 }
        );
      }
    }

    if (location !== undefined) {
      if (
        typeof location !== 'object' ||
        location === null ||
        typeof location.lat !== 'number' ||
        typeof location.lng !== 'number' ||
        typeof location.address !== 'string'
      ) {
        return NextResponse.json(
          {
            error:
              'Location must be an object with lat (number), lng (number), and address (string) properties',
            code: 'INVALID_LOCATION',
          },
          { status: 400 }
        );
      }
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (scheduledDate !== undefined) updates.scheduledDate = scheduledDate;
    if (durationHours !== undefined)
      updates.durationHours = parseInt(durationHours);
    if (maxParticipants !== undefined)
      updates.maxParticipants = parseInt(maxParticipants);
    if (location !== undefined) updates.location = location;

    const updated = await db
      .update(cleanupDrives)
      .set(updates)
      .where(eq(cleanupDrives.id, driveId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update cleanup drive', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const driveId = parseInt(id);

    const existingDrive = await db
      .select()
      .from(cleanupDrives)
      .where(eq(cleanupDrives.id, driveId))
      .limit(1);

    if (existingDrive.length === 0) {
      return NextResponse.json(
        { error: 'Cleanup drive not found', code: 'DRIVE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(cleanupDrives)
      .where(eq(cleanupDrives.id, driveId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete cleanup drive', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Cleanup drive deleted successfully',
        deletedDrive: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}