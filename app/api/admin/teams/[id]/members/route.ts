import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, municipalityTeams } from '@/db/schema';
import { eq, and, asc, isNull } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;

    // Validate team ID
    if (!teamId || isNaN(parseInt(teamId)) || parseInt(teamId) <= 0) {
      return NextResponse.json(
        { 
          error: 'Valid team ID is required',
          code: 'INVALID_TEAM_ID'
        },
        { status: 400 }
      );
    }

    const parsedTeamId = parseInt(teamId);

    // Check if team exists
    const team = await db.select()
      .from(municipalityTeams)
      .where(eq(municipalityTeams.id, parsedTeamId))
      .limit(1);

    if (team.length === 0) {
      return NextResponse.json(
        { 
          error: 'Team not found',
          code: 'TEAM_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = limitParam 
      ? Math.min(Math.max(parseInt(limitParam), 1), 100)
      : 50;
    const offset = offsetParam 
      ? Math.max(parseInt(offsetParam), 0)
      : 0;

    // Validate pagination parameters
    if (limitParam && (isNaN(parseInt(limitParam)) || parseInt(limitParam) <= 0)) {
      return NextResponse.json(
        { 
          error: 'Limit must be a positive integer',
          code: 'INVALID_LIMIT'
        },
        { status: 400 }
      );
    }

    if (offsetParam && (isNaN(parseInt(offsetParam)) || parseInt(offsetParam) < 0)) {
      return NextResponse.json(
        { 
          error: 'Offset must be a non-negative integer',
          code: 'INVALID_OFFSET'
        },
        { status: 400 }
      );
    }

    // Query team members
    const teamMembers = await db.select()
      .from(users)
      .where(
        and(
          eq(users.teamId, parsedTeamId),
          eq(users.role, 'municipality-worker')
        )
      )
      .orderBy(asc(users.name))
      .limit(limit)
      .offset(offset);

    // Exclude password field from response
    const sanitizedMembers = teamMembers.map(({ password, ...user }) => user);

    return NextResponse.json(sanitizedMembers, { status: 200 });

  } catch (error) {
    console.error('GET team members error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;

    // Validate team ID
    if (!teamId || isNaN(parseInt(teamId)) || parseInt(teamId) <= 0) {
      return NextResponse.json(
        { 
          error: 'Valid team ID is required',
          code: 'INVALID_TEAM_ID'
        },
        { status: 400 }
      );
    }

    const parsedTeamId = parseInt(teamId);

    // Parse request body
    const body = await request.json();
    const { userId } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'userId is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    // Validate userId format
    if (isNaN(parseInt(userId)) || parseInt(userId) <= 0) {
      return NextResponse.json(
        { 
          error: 'Valid user ID is required',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }

    const parsedUserId = parseInt(userId);

    // Check if team exists
    const team = await db.select()
      .from(municipalityTeams)
      .where(eq(municipalityTeams.id, parsedTeamId))
      .limit(1);

    if (team.length === 0) {
      return NextResponse.json(
        { 
          error: 'Team not found',
          code: 'TEAM_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Check if user exists
    const user = await db.select()
      .from(users)
      .where(eq(users.id, parsedUserId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const targetUser = user[0];

    // Check if user is a municipality worker
    if (targetUser.role !== 'municipality-worker') {
      return NextResponse.json(
        { 
          error: 'User is not a municipality worker',
          code: 'INVALID_USER_ROLE'
        },
        { status: 400 }
      );
    }

    // Check if user is already assigned to a team
    if (targetUser.teamId !== null) {
      return NextResponse.json(
        { 
          error: 'Worker already assigned to another team',
          code: 'WORKER_ALREADY_ASSIGNED'
        },
        { status: 400 }
      );
    }

    // Update user's teamId
    const updatedUser = await db.update(users)
      .set({ teamId: parsedTeamId })
      .where(eq(users.id, parsedUserId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Exclude password field from response
    const { password, ...sanitizedUser } = updatedUser[0];

    return NextResponse.json(sanitizedUser, { status: 200 });

  } catch (error) {
    console.error('POST add worker to team error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}