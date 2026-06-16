import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return NextResponse.json(
        { 
          error: 'Valid positive integer ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const reportId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { status, workerId } = body;

    // Validate required fields
    if (!status) {
      return NextResponse.json(
        { 
          error: 'Status is required',
          code: 'MISSING_STATUS' 
        },
        { status: 400 }
      );
    }

    if (!workerId) {
      return NextResponse.json(
        { 
          error: 'Worker ID is required',
          code: 'MISSING_WORKER_ID' 
        },
        { status: 400 }
      );
    }

    // Validate status is one of allowed values
    const allowedStatuses = ['assigned', 'in_progress', 'resolved'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status value. Must be one of: assigned, in_progress, resolved',
          code: 'INVALID_STATUS' 
        },
        { status: 400 }
      );
    }

    // Validate workerId is valid integer
    if (isNaN(parseInt(workerId)) || parseInt(workerId) <= 0) {
      return NextResponse.json(
        { 
          error: 'Valid positive integer worker ID is required',
          code: 'INVALID_WORKER_ID' 
        },
        { status: 400 }
      );
    }

    const workerIdInt = parseInt(workerId);

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

    const report = existingReport[0];

    // Check if worker exists
    const existingWorker = await db.select()
      .from(users)
      .where(eq(users.id, workerIdInt))
      .limit(1);

    if (existingWorker.length === 0) {
      return NextResponse.json(
        { 
          error: 'Worker not found',
          code: 'WORKER_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const worker = existingWorker[0];

    // Check if worker is municipality-worker
    if (worker.role !== 'municipality-worker') {
      return NextResponse.json(
        { 
          error: 'Not authorized. User must be a municipality worker',
          code: 'NOT_AUTHORIZED' 
        },
        { status: 403 }
      );
    }

    // Check if worker has teamId
    if (!worker.teamId) {
      return NextResponse.json(
        { 
          error: 'Worker not assigned to team',
          code: 'WORKER_NO_TEAM' 
        },
        { status: 400 }
      );
    }

    // Check if report.assignedTeamId matches worker.teamId
    if (report.assignedTeamId !== worker.teamId) {
      return NextResponse.json(
        { 
          error: 'Report not assigned to worker\'s team',
          code: 'TEAM_MISMATCH' 
        },
        { status: 403 }
      );
    }

    // Prepare update data
    const currentTimestamp = new Date().toISOString();
    const updateData: {
      status: string;
      assignedTo: number;
      updatedAt: string;
      resolvedAt?: string;
    } = {
      status,
      assignedTo: workerIdInt,
      updatedAt: currentTimestamp,
    };

    // If status is resolved, set resolvedAt
    if (status === 'resolved') {
      updateData.resolvedAt = currentTimestamp;
    }

    // Update the report
    const updatedReport = await db.update(reports)
      .set(updateData)
      .where(eq(reports.id, reportId))
      .returning();

    if (updatedReport.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to update report',
          code: 'UPDATE_FAILED' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedReport[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}