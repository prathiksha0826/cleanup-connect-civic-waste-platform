import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports } from '@/db/schema';
import { eq, isNull, isNotNull, and, desc } from 'drizzle-orm';

const ALLOWED_STATUSES = ['pending', 'assigned', 'in_progress', 'resolved', 'rejected'];
const ALLOWED_SEVERITIES = ['low', 'medium', 'high', 'critical'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse pagination parameters
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    const limit = limitParam ? parseInt(limitParam) : 50;
    const offset = offsetParam ? parseInt(offsetParam) : 0;

    // Validate pagination parameters
    if (isNaN(limit) || limit <= 0 || limit > 100) {
      return NextResponse.json(
        { 
          error: 'Invalid limit parameter. Must be a positive integer not exceeding 100',
          code: 'INVALID_LIMIT'
        },
        { status: 400 }
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { 
          error: 'Invalid offset parameter. Must be a non-negative integer',
          code: 'INVALID_OFFSET'
        },
        { status: 400 }
      );
    }

    // Parse filter parameters
    const statusParam = searchParams.get('status');
    const wardNumberParam = searchParams.get('wardNumber');
    const severityParam = searchParams.get('severity');
    const teamIdParam = searchParams.get('teamId');
    const assignedParam = searchParams.get('assigned');

    // Validate filter parameters
    if (statusParam && !ALLOWED_STATUSES.includes(statusParam)) {
      return NextResponse.json(
        { 
          error: `Invalid status parameter. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    if (severityParam && !ALLOWED_SEVERITIES.includes(severityParam)) {
      return NextResponse.json(
        { 
          error: `Invalid severity parameter. Must be one of: ${ALLOWED_SEVERITIES.join(', ')}`,
          code: 'INVALID_SEVERITY'
        },
        { status: 400 }
      );
    }

    let wardNumber: number | null = null;
    if (wardNumberParam) {
      wardNumber = parseInt(wardNumberParam);
      if (isNaN(wardNumber)) {
        return NextResponse.json(
          { 
            error: 'Invalid wardNumber parameter. Must be an integer',
            code: 'INVALID_WARD_NUMBER'
          },
          { status: 400 }
        );
      }
    }

    let teamId: number | null = null;
    if (teamIdParam) {
      teamId = parseInt(teamIdParam);
      if (isNaN(teamId)) {
        return NextResponse.json(
          { 
            error: 'Invalid teamId parameter. Must be an integer',
            code: 'INVALID_TEAM_ID'
          },
          { status: 400 }
        );
      }
    }

    if (assignedParam && assignedParam !== 'true' && assignedParam !== 'false') {
      return NextResponse.json(
        { 
          error: 'Invalid assigned parameter. Must be "true" or "false"',
          code: 'INVALID_ASSIGNED'
        },
        { status: 400 }
      );
    }

    // Build where conditions
    const conditions = [];

    if (statusParam) {
      conditions.push(eq(reports.status, statusParam));
    }

    if (severityParam) {
      conditions.push(eq(reports.severity, severityParam));
    }

    if (wardNumber !== null) {
      conditions.push(eq(reports.wardNumber, wardNumber));
    }

    if (teamId !== null) {
      conditions.push(eq(reports.assignedTeamId, teamId));
    }

    if (assignedParam === 'true') {
      conditions.push(isNotNull(reports.assignedTeamId));
    } else if (assignedParam === 'false') {
      conditions.push(isNull(reports.assignedTeamId));
    }

    // Build query
    let query = db.select().from(reports);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply ordering and pagination
    const results = await query
      .orderBy(desc(reports.priorityScore), desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}