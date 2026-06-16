import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports, municipalityTeams, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return distance;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return NextResponse.json(
        { error: 'Valid positive integer ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const reportId = parseInt(id);
    const body = await request.json();
    const { adminId } = body;

    if (!adminId) {
      return NextResponse.json(
        { error: 'adminId is required', code: 'MISSING_ADMIN_ID' },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(adminId))) {
      return NextResponse.json(
        { error: 'Valid adminId is required', code: 'INVALID_ADMIN_ID' },
        { status: 400 }
      );
    }

    const adminIdInt = parseInt(adminId);

    const existingReport = await db.select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (existingReport.length === 0) {
      return NextResponse.json(
        { error: 'Report not found', code: 'REPORT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const report = existingReport[0];

    const adminUser = await db.select()
      .from(users)
      .where(eq(users.id, adminIdInt))
      .limit(1);

    if (adminUser.length === 0) {
      return NextResponse.json(
        { error: 'Admin user not found', code: 'ADMIN_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (adminUser[0].role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Not authorized', code: 'NOT_AUTHORIZED' },
        { status: 403 }
      );
    }

    const reportLocation = report.location as { lat: number; lng: number; address?: string };

    if (!reportLocation || typeof reportLocation.lat !== 'number' || typeof reportLocation.lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid report location format', code: 'INVALID_LOCATION' },
        { status: 400 }
      );
    }

    const { lat: reportLat, lng: reportLng } = reportLocation;

    const activeTeams = await db.select()
      .from(municipalityTeams)
      .where(eq(municipalityTeams.status, 'active'));

    if (activeTeams.length === 0) {
      return NextResponse.json(
        { error: 'No active teams available', code: 'NO_ACTIVE_TEAMS' },
        { status: 400 }
      );
    }

    const teamsWithDistance = activeTeams.map(team => {
      const serviceArea = team.serviceArea as { lat: number; lng: number; radius?: number };
      const teamLat = serviceArea.lat;
      const teamLng = serviceArea.lng;

      const distance = calculateDistance(reportLat, reportLng, teamLat, teamLng);

      return {
        teamId: team.id,
        distance,
        team
      };
    });

    teamsWithDistance.sort((a, b) => a.distance - b.distance);

    let selectedTeam = teamsWithDistance[0];

    if (report.wardNumber) {
      const wardMatchTeam = teamsWithDistance.find(teamData => {
        const wardNumbers = teamData.team.wardNumbers as number[];
        return wardNumbers.includes(report.wardNumber!);
      });

      if (wardMatchTeam) {
        selectedTeam = wardMatchTeam;
      } else {
        console.warn(`Ward ${report.wardNumber} not found in nearest team's ward list. Using nearest team anyway.`);
      }
    }

    const now = new Date().toISOString();
    const newStatus = report.status === 'pending' ? 'assigned' : report.status;

    const updatedReport = await db.update(reports)
      .set({
        assignedTeamId: selectedTeam.teamId,
        assignedMunicipality: selectedTeam.team.name,
        assignedBy: adminIdInt,
        assignmentDate: now,
        status: newStatus,
        updatedAt: now
      })
      .where(eq(reports.id, reportId))
      .returning();

    if (updatedReport.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update report', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    const response = {
      ...updatedReport[0],
      assignedTeamDistance: parseFloat(selectedTeam.distance.toFixed(2)),
      assignedTeamName: selectedTeam.team.name
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}