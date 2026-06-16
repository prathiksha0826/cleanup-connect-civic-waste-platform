import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports } from '@/db/schema';
import { eq } from 'drizzle-orm';

const EMISSION_FACTORS: Record<string, number> = {
  plastic: 0.54,
  metal: 6.0,
  glass: 0.09,
  organic: 0.40,
  electronic: 6.5,
  mixed: 0.15,
  hazardous: 0.30,
};

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return NextResponse.json(
        {
          error: 'Valid positive ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const reportId = parseInt(id);
    const body = await request.json();
    const { estimatedWeightKg } = body;

    if (estimatedWeightKg === undefined || estimatedWeightKg === null) {
      return NextResponse.json(
        {
          error: 'estimatedWeightKg is required',
          code: 'MISSING_REQUIRED_FIELD',
        },
        { status: 400 }
      );
    }

    if (typeof estimatedWeightKg !== 'number' || isNaN(estimatedWeightKg)) {
      return NextResponse.json(
        {
          error: 'estimatedWeightKg must be a valid number',
          code: 'INVALID_WEIGHT_TYPE',
        },
        { status: 400 }
      );
    }

    if (estimatedWeightKg <= 0) {
      return NextResponse.json(
        {
          error: 'estimatedWeightKg must be a positive number',
          code: 'INVALID_WEIGHT_VALUE',
        },
        { status: 400 }
      );
    }

    const existingReport = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (existingReport.length === 0) {
      return NextResponse.json(
        {
          error: 'Report not found',
          code: 'REPORT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const report = existingReport[0];
    const wasteType = report.wasteType;

    if (!EMISSION_FACTORS.hasOwnProperty(wasteType)) {
      return NextResponse.json(
        {
          error: `Invalid waste type: ${wasteType}. Must be one of: ${Object.keys(EMISSION_FACTORS).join(', ')}`,
          code: 'INVALID_WASTE_TYPE',
        },
        { status: 400 }
      );
    }

    const emissionFactor = EMISSION_FACTORS[wasteType];
    const carbonFootprintKg = estimatedWeightKg * emissionFactor;

    const updatedReport = await db
      .update(reports)
      .set({
        carbonFootprintKg,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(reports.id, reportId))
      .returning();

    if (updatedReport.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to update report',
          code: 'UPDATE_FAILED',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedReport[0], { status: 200 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}