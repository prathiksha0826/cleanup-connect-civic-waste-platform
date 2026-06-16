import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, municipalityTeams } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  try {
    const { teamId, userId } = await params;

    // Validate teamId
    if (!teamId || isNaN(parseInt(teamId)) || parseInt(teamId) <= 0) {
      return NextResponse.json(
        { 
          error: 'Valid positive teamId is required',
          code: 'INVALID_TEAM_ID'
        },
        { status: 400 }
      );
    }

    // Validate userId
    if (!userId || isNaN(parseInt(userId)) || parseInt(userId) <= 0) {
      return NextResponse.json(
        { 
          error: 'Valid positive userId is required',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }

    const parsedTeamId = parseInt(teamId);
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

    const currentUser = user[0];

    // Check if user is a municipality worker
    if (currentUser.role !== 'municipality-worker') {
      return NextResponse.json(
        { 
          error: 'User is not a municipality worker',
          code: 'NOT_MUNICIPALITY_WORKER'
        },
        { status: 400 }
      );
    }

    // Check if user is assigned to this team
    if (currentUser.teamId !== parsedTeamId) {
      return NextResponse.json(
        { 
          error: 'Worker is not assigned to this team',
          code: 'WORKER_NOT_IN_TEAM'
        },
        { status: 400 }
      );
    }

    // Remove worker from team
    const updatedUser = await db.update(users)
      .set({
        teamId: null
      })
      .where(eq(users.id, parsedUserId))
      .returning();

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser[0];

    return NextResponse.json(
      {
        message: 'Worker removed from team successfully',
        user: userWithoutPassword
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}