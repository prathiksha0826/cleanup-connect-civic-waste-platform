import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contributions, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const ALLOWED_ACTION_TYPES = ['report_created', 'report_resolved', 'community_cleanup'];

export async function GET(request: NextRequest) {
  try {
    // Extract userId from URL pathname (last segment)
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const userIdParam = segments[segments.length - 1];

    // Validate userId
    if (!userIdParam || isNaN(parseInt(userIdParam))) {
      return NextResponse.json({ 
        error: "Valid user ID is required",
        code: "INVALID_USER_ID" 
      }, { status: 400 });
    }

    const userId = parseInt(userIdParam);

    // Check if user exists
    const userExists = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: "USER_NOT_FOUND" 
      }, { status: 404 });
    }

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const actionType = searchParams.get('actionType');

    // Validate actionType if provided
    if (actionType && !ALLOWED_ACTION_TYPES.includes(actionType)) {
      return NextResponse.json({ 
        error: `Invalid action type. Allowed values: ${ALLOWED_ACTION_TYPES.join(', ')}`,
        code: "INVALID_ACTION_TYPE" 
      }, { status: 400 });
    }

    // Build query
    let query = db.select()
      .from(contributions)
      .where(eq(contributions.userId, userId));

    // Apply actionType filter if provided
    if (actionType) {
      query = db.select()
        .from(contributions)
        .where(
          and(
            eq(contributions.userId, userId),
            eq(contributions.actionType, actionType)
          )
        );
    }

    // Execute query with sorting and pagination
    const results = await query
      .orderBy(desc(contributions.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}