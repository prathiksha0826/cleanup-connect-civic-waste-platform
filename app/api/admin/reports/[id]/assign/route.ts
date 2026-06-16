import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports, municipalityTeams, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return NextResponse.json(
        { 
          error: 'Valid report ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const reportId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { teamId, adminId } = body;

    // Validate required fields
    if (!teamId) {
      return NextResponse.json(
        { 
          error: 'teamId is required',
          code: 'MISSING_TEAM_ID'
        },
        { status: 400 }
      );
    }

    if (!adminId) {
      return NextResponse.json(
        { 
          error: 'adminId is required',
          code: 'MISSING_ADMIN_ID'
        },
        { status: 400 }
      );
    }

    // Validate field formats
    if (isNaN(parseInt(teamId)) || parseInt(teamId) <= 0) {
      return NextResponse.json(
        { 
          error: 'teamId must be a valid positive integer',
          code: 'INVALID_TEAM_ID'
        },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(adminId)) || parseInt(adminId) <= 0) {
      return NextResponse.json(
        { 
          error: 'adminId must be a valid positive integer',
          code: 'INVALID_ADMIN_ID'
        },
        { status: 400 }
      );
    }

    const parsedTeamId = parseInt(teamId);
    const parsedAdminId = parseInt(adminId);

    // Check if report exists
    const existingReport = await db.select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (existingReport.length === 0) {
      return NextResponse.json(
        { 
          error: 'Report not found',
          code: 'REPORT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Check if team exists
    const existingTeam = await db.select()
      .from(municipalityTeams)
      .where(eq(municipalityTeams.id, parsedTeamId))
      .limit(1);

    if (existingTeam.length === 0) {
      return NextResponse.json(
        { 
          error: 'Team not found',
          code: 'TEAM_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Check if team is active
    if (existingTeam[0].status !== 'active') {
      return NextResponse.json(
        { 
          error: 'Team is not active',
          code: 'TEAM_NOT_ACTIVE'
        },
        { status: 400 }
      );
    }

    // Check if admin user exists
    const adminUser = await db.select()
      .from(users)
      .where(eq(users.id, parsedAdminId))
      .limit(1);

    if (adminUser.length === 0) {
      return NextResponse.json(
        { 
          error: 'Admin user not found',
          code: 'ADMIN_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Check if user is super-admin
    if (adminUser[0].role !== 'super-admin') {
      return NextResponse.json(
        { 
          error: 'Not authorized',
          code: 'NOT_AUTHORIZED'
        },
        { status: 403 }
      );
    }

    // Prepare update data
    const currentTimestamp = new Date().toISOString();
    const currentReport = existingReport[0];
    
    const updateData: any = {
      assignedTeamId: parsedTeamId,
      assignedBy: parsedAdminId,
      assignmentDate: currentTimestamp,
      updatedAt: currentTimestamp,
    };

    // Set status to 'assigned' if currently 'pending'
    if (currentReport.status === 'pending') {
      updateData.status = 'assigned';
    }

    // Update report
    const updatedReport = await db.update(reports)
      .set(updateData)
      .where(eq(reports.id, reportId))
      .returning();

    return NextResponse.json(updatedReport[0], { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}