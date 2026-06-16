import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports, users } from '@/db/schema';
import { eq, and, isNotNull, sum, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    // Validate userId parameter
    if (!userIdParam) {
      return NextResponse.json(
        { 
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdParam);

    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { 
          error: 'Valid positive integer User ID is required',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const userExists = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Query all reports for this userId where status = 'resolved' AND carbonFootprintKg IS NOT NULL
    const userReports = await db.select({
      carbonFootprintKg: reports.carbonFootprintKg
    })
      .from(reports)
      .where(
        and(
          eq(reports.userId, userId),
          eq(reports.status, 'resolved'),
          isNotNull(reports.carbonFootprintKg)
        )
      );

    // Calculate statistics
    let totalCarbonFootprintKg = 0;
    const reportCount = userReports.length;

    if (reportCount > 0) {
      totalCarbonFootprintKg = userReports.reduce((sum, report) => {
        return sum + (report.carbonFootprintKg || 0);
      }, 0);
    }

    // Round to 2 decimals
    totalCarbonFootprintKg = Math.round(totalCarbonFootprintKg * 100) / 100;

    // Calculate equivalents
    const equivalentTrees = totalCarbonFootprintKg > 0 
      ? Math.round((totalCarbonFootprintKg / 21.77) * 100) / 100
      : 0;
    
    const equivalentMiles = totalCarbonFootprintKg > 0
      ? Math.round((totalCarbonFootprintKg * 2.42) * 100) / 100
      : 0;

    return NextResponse.json({
      totalCarbonFootprintKg,
      reportCount,
      equivalentTrees,
      equivalentMiles
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}