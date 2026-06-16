import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { municipalityTeams } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const teamId = parseInt(id);

    // Query team by ID
    const team = await db
      .select()
      .from(municipalityTeams)
      .where(eq(municipalityTeams.id, teamId))
      .limit(1);

    if (team.length === 0) {
      return NextResponse.json(
        { error: 'Team not found', code: 'TEAM_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(team[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const teamId = parseInt(id);

    // Check if team exists
    const existingTeam = await db
      .select()
      .from(municipalityTeams)
      .where(eq(municipalityTeams.id, teamId))
      .limit(1);

    if (existingTeam.length === 0) {
      return NextResponse.json(
        { error: 'Team not found', code: 'TEAM_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, serviceArea, wardNumbers, contactPhone, contactEmail, status } = body;

    // Validate provided fields
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Name must be a non-empty string', code: 'INVALID_NAME' },
          { status: 400 }
        );
      }
    }

    if (serviceArea !== undefined) {
      if (typeof serviceArea !== 'object' || serviceArea === null || Array.isArray(serviceArea)) {
        return NextResponse.json(
          { error: 'Service area must be a valid JSON object', code: 'INVALID_SERVICE_AREA' },
          { status: 400 }
        );
      }
    }

    if (wardNumbers !== undefined) {
      if (!Array.isArray(wardNumbers) || wardNumbers.length === 0) {
        return NextResponse.json(
          { error: 'Ward numbers must be an array with at least one element', code: 'INVALID_WARD_NUMBERS' },
          { status: 400 }
        );
      }
    }

    if (contactEmail !== undefined) {
      if (typeof contactEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        return NextResponse.json(
          { error: 'Contact email must be a valid email format', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }
    }

    if (contactPhone !== undefined) {
      if (typeof contactPhone !== 'string') {
        return NextResponse.json(
          { error: 'Contact phone must be a string', code: 'INVALID_PHONE' },
          { status: 400 }
        );
      }
    }

    if (status !== undefined) {
      if (status !== 'active' && status !== 'inactive') {
        return NextResponse.json(
          { error: 'Status must be either "active" or "inactive"', code: 'INVALID_STATUS' },
          { status: 400 }
        );
      }
    }

    // Build updates object with only provided fields
    const updates: {
      name?: string;
      serviceArea?: any;
      wardNumbers?: any;
      contactPhone?: string;
      contactEmail?: string;
      status?: string;
    } = {};

    if (name !== undefined) updates.name = name.trim();
    if (serviceArea !== undefined) updates.serviceArea = serviceArea;
    if (wardNumbers !== undefined) updates.wardNumbers = wardNumbers;
    if (contactPhone !== undefined) updates.contactPhone = contactPhone;
    if (contactEmail !== undefined) updates.contactEmail = contactEmail.toLowerCase();
    if (status !== undefined) updates.status = status;

    // Update team
    const updatedTeam = await db
      .update(municipalityTeams)
      .set(updates)
      .where(eq(municipalityTeams.id, teamId))
      .returning();

    return NextResponse.json(updatedTeam[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
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

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const teamId = parseInt(id);

    // Check if team exists
    const existingTeam = await db
      .select()
      .from(municipalityTeams)
      .where(eq(municipalityTeams.id, teamId))
      .limit(1);

    if (existingTeam.length === 0) {
      return NextResponse.json(
        { error: 'Team not found', code: 'TEAM_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete team
    const deletedTeam = await db
      .delete(municipalityTeams)
      .where(eq(municipalityTeams.id, teamId))
      .returning();

    return NextResponse.json(
      {
        message: 'Team deleted successfully',
        deletedTeam: deletedTeam[0]
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