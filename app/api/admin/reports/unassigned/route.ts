import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports } from '@/db/schema';
import { isNull, and, eq, desc, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse pagination parameters
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    let limit = 50;
    let offset = 0;
    
    // Validate limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return NextResponse.json(
          { 
            error: 'Limit must be a positive integer',
            code: 'INVALID_LIMIT'
          },
          { status: 400 }
        );
      }
      limit = Math.min(parsedLimit, 100);
    }
    
    // Validate offset
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return NextResponse.json(
          { 
            error: 'Offset must be a non-negative integer',
            code: 'INVALID_OFFSET'
          },
          { status: 400 }
        );
      }
      offset = parsedOffset;
    }
    
    // Parse optional filters
    const severityParam = searchParams.get('severity');
    const wardNumberParam = searchParams.get('wardNumber');
    const wasteTypeParam = searchParams.get('wasteType');
    
    // Validate severity if provided
    const allowedSeverities = ['low', 'medium', 'high', 'critical'];
    if (severityParam && !allowedSeverities.includes(severityParam)) {
      return NextResponse.json(
        { 
          error: `Severity must be one of: ${allowedSeverities.join(', ')}`,
          code: 'INVALID_SEVERITY'
        },
        { status: 400 }
      );
    }
    
    // Validate ward number if provided
    let wardNumber: number | null = null;
    if (wardNumberParam) {
      wardNumber = parseInt(wardNumberParam);
      if (isNaN(wardNumber)) {
        return NextResponse.json(
          { 
            error: 'Ward number must be a valid integer',
            code: 'INVALID_WARD_NUMBER'
          },
          { status: 400 }
        );
      }
    }
    
    // Build WHERE conditions
    const conditions = [isNull(reports.assignedTeamId)];
    
    if (severityParam) {
      conditions.push(eq(reports.severity, severityParam));
    }
    
    if (wardNumber !== null) {
      conditions.push(eq(reports.wardNumber, wardNumber));
    }
    
    if (wasteTypeParam) {
      conditions.push(eq(reports.wasteType, wasteTypeParam));
    }
    
    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];
    
    // Get total count of unassigned reports with filters
    const totalResult = await db
      .select({ count: count() })
      .from(reports)
      .where(whereCondition);
    
    const total = totalResult[0]?.count || 0;
    
    // Query unassigned reports with filters, sorting, and pagination
    const unassignedReports = await db
      .select()
      .from(reports)
      .where(whereCondition)
      .orderBy(desc(reports.priorityScore), desc(reports.createdAt))
      .limit(limit)
      .offset(offset);
    
    return NextResponse.json(
      {
        reports: unassignedReports,
        total,
        limit,
        offset
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('GET unassigned reports error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}