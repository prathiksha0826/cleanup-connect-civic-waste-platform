import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { municipalityTeams, reports } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Haversine formula to calculate distance between two coordinates in kilometers
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
            Math.sin(dLng / 2) ** 2;
  
  const c = 2 * Math.asin(Math.sqrt(a));
  const distance = 6371 * c; // Earth radius in kilometers
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const limitParam = searchParams.get('limit');

    // Validate required parameters
    if (!latParam || !lngParam) {
      return NextResponse.json({ 
        error: 'Both lat and lng query parameters are required',
        code: 'MISSING_COORDINATES' 
      }, { status: 400 });
    }

    // Parse and validate lat/lng are numbers
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ 
        error: 'Latitude and longitude must be valid numbers',
        code: 'INVALID_COORDINATE_FORMAT' 
      }, { status: 400 });
    }

    // Validate lat/lng ranges
    if (lat < -90 || lat > 90) {
      return NextResponse.json({ 
        error: 'Latitude must be between -90 and 90',
        code: 'INVALID_LATITUDE_RANGE' 
      }, { status: 400 });
    }

    if (lng < -180 || lng > 180) {
      return NextResponse.json({ 
        error: 'Longitude must be between -180 and 180',
        code: 'INVALID_LONGITUDE_RANGE' 
      }, { status: 400 });
    }

    // Parse and validate limit
    let limit = 1;
    if (limitParam) {
      limit = parseInt(limitParam);
      if (isNaN(limit) || limit < 1 || limit > 5) {
        return NextResponse.json({ 
          error: 'Limit must be an integer between 1 and 5',
          code: 'INVALID_LIMIT' 
        }, { status: 400 });
      }
    }

    // Query all active teams
    const activeTeams = await db.select()
      .from(municipalityTeams)
      .where(eq(municipalityTeams.status, 'active'));

    if (activeTeams.length === 0) {
      return NextResponse.json({ 
        error: 'No active teams available',
        code: 'NO_ACTIVE_TEAMS' 
      }, { status: 404 });
    }

    // Calculate distances for all active teams
    const teamsWithDistance = activeTeams.map(team => {
      const serviceArea = team.serviceArea as { lat: number; lng: number; radius?: number };
      const distance = calculateDistance(lat, lng, serviceArea.lat, serviceArea.lng);
      
      return {
        team,
        distance
      };
    });

    // Sort by distance ascending
    teamsWithDistance.sort((a, b) => a.distance - b.distance);

    // Return based on limit
    if (limit === 1) {
      const nearest = teamsWithDistance[0];
      return NextResponse.json({
        team: nearest.team,
        distance: nearest.distance
      }, { status: 200 });
    } else {
      const topTeams = teamsWithDistance.slice(0, limit);
      return NextResponse.json({
        teams: topTeams
      }, { status: 200 });
    }

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, latitude, longitude } = body;

    // Validate required parameters
    if (!reportId || !latitude || !longitude) {
      return NextResponse.json({ 
        error: 'reportId, latitude, and longitude are required',
        code: 'MISSING_PARAMETERS' 
      }, { status: 400 });
    }

    // Parse and validate lat/lng are numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ 
        error: 'Latitude and longitude must be valid numbers',
        code: 'INVALID_COORDINATE_FORMAT' 
      }, { status: 400 });
    }

    // Validate lat/lng ranges
    if (lat < -90 || lat > 90) {
      return NextResponse.json({ 
        error: 'Latitude must be between -90 and 90',
        code: 'INVALID_LATITUDE_RANGE' 
      }, { status: 400 });
    }

    if (lng < -180 || lng > 180) {
      return NextResponse.json({ 
        error: 'Longitude must be between -180 and 180',
        code: 'INVALID_LONGITUDE_RANGE' 
      }, { status: 400 });
    }

    // Query all active teams
    const activeTeams = await db.select()
      .from(municipalityTeams)
      .where(eq(municipalityTeams.status, 'active'));

    if (activeTeams.length === 0) {
      return NextResponse.json({ 
        error: 'No active teams available',
        code: 'NO_ACTIVE_TEAMS' 
      }, { status: 404 });
    }

    // Calculate distances for all active teams
    const teamsWithDistance = activeTeams.map(team => {
      const serviceArea = team.serviceArea as { lat: number; lng: number; radius?: number };
      const distance = calculateDistance(lat, lng, serviceArea.lat, serviceArea.lng);
      
      return {
        team,
        distance
      };
    });

    // Sort by distance ascending
    teamsWithDistance.sort((a, b) => a.distance - b.distance);

    // Get the nearest team
    const nearest = teamsWithDistance[0];

    // Update the report with assignment including municipality name
    const now = new Date().toISOString();
    await db.update(reports)
      .set({
        assignedTeamId: nearest.team.id,
        assignedMunicipality: nearest.team.name,
        assignmentDate: now,
        status: 'assigned',
        updatedAt: now
      })
      .where(eq(reports.id, reportId));

    return NextResponse.json({
      teamId: nearest.team.id,
      teamName: nearest.team.name,
      distance: nearest.distance
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}