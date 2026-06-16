import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contributions, users, reports } from '@/db/schema';
import { eq } from 'drizzle-orm';

const ALLOWED_ACTION_TYPES = ['report_created', 'report_resolved', 'community_cleanup'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, reportId, actionType, pointsEarned } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (!actionType) {
      return NextResponse.json(
        { error: 'actionType is required', code: 'MISSING_ACTION_TYPE' },
        { status: 400 }
      );
    }

    if (pointsEarned === undefined || pointsEarned === null) {
      return NextResponse.json(
        { error: 'pointsEarned is required', code: 'MISSING_POINTS_EARNED' },
        { status: 400 }
      );
    }

    // Validate userId is valid integer
    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return NextResponse.json(
        { error: 'userId must be a valid integer', code: 'INVALID_USER_ID' },
        { status: 400 }
      );
    }

    // Validate reportId if provided
    let parsedReportId = null;
    if (reportId !== undefined && reportId !== null) {
      parsedReportId = parseInt(reportId);
      if (isNaN(parsedReportId)) {
        return NextResponse.json(
          { error: 'reportId must be a valid integer', code: 'INVALID_REPORT_ID' },
          { status: 400 }
        );
      }
    }

    // Validate actionType
    if (!ALLOWED_ACTION_TYPES.includes(actionType)) {
      return NextResponse.json(
        {
          error: `actionType must be one of: ${ALLOWED_ACTION_TYPES.join(', ')}`,
          code: 'INVALID_ACTION_TYPE'
        },
        { status: 400 }
      );
    }

    // Validate pointsEarned is positive integer
    const parsedPointsEarned = parseInt(pointsEarned);
    if (isNaN(parsedPointsEarned) || parsedPointsEarned <= 0) {
      return NextResponse.json(
        { error: 'pointsEarned must be a positive integer', code: 'INVALID_POINTS_EARNED' },
        { status: 400 }
      );
    }

    // Check if user exists and get current points
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, parsedUserId))
      .limit(1);

    if (userRecord.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const currentUser = userRecord[0];
    const currentPoints = currentUser.points || 0;
    const newTotalPoints = currentPoints + parsedPointsEarned;

    // Check if reportId exists if provided
    if (parsedReportId !== null) {
      const reportRecord = await db
        .select()
        .from(reports)
        .where(eq(reports.id, parsedReportId))
        .limit(1);

      if (reportRecord.length === 0) {
        return NextResponse.json(
          { error: 'Report not found', code: 'REPORT_NOT_FOUND' },
          { status: 404 }
        );
      }
    }

    // Create contribution record
    const newContribution = await db
      .insert(contributions)
      .values({
        userId: parsedUserId,
        reportId: parsedReportId,
        actionType,
        pointsEarned: parsedPointsEarned,
        createdAt: new Date().toISOString()
      })
      .returning();

    // Update user's total points
    await db
      .update(users)
      .set({
        points: newTotalPoints,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, parsedUserId));

    // Return created contribution with new total points
    return NextResponse.json(
      {
        ...newContribution[0],
        newTotalPoints
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}