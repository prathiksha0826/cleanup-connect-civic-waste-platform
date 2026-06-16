import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workerId = searchParams.get('workerId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');

    // Validate workerId is provided
    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID is required', code: 'MISSING_WORKER_ID' },
        { status: 400 }
      );
    }

    // Validate workerId is valid integer
    const workerIdInt = parseInt(workerId);
    if (isNaN(workerIdInt) || workerIdInt <= 0) {
      return NextResponse.json(
        { error: 'Valid worker ID is required', code: 'INVALID_WORKER_ID' },
        { status: 400 }
      );
    }

    // Validate limit
    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json(
        { error: 'Limit must be a positive integer', code: 'INVALID_LIMIT' },
        { status: 400 }
      );
    }

    // Validate offset
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be a non-negative integer', code: 'INVALID_OFFSET' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ['assigned', 'in_progress', 'resolved'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: assigned, in_progress, resolved', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // Validate severity if provided
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity. Must be one of: low, medium, high, critical', code: 'INVALID_SEVERITY' },
        { status: 400 }
      );
    }

    // Query user table to find worker
    const worker = await db.select()
      .from(users)
      .where(eq(users.id, workerIdInt))
      .limit(1);

    if (worker.length === 0) {
      return NextResponse.json(
        { error: 'Worker not found', code: 'WORKER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const workerData = worker[0];

    // Check if user has municipality-worker role
    if (workerData.role !== 'municipality-worker') {
      return NextResponse.json(
        { error: 'Not authorized as worker', code: 'NOT_AUTHORIZED' },
        { status: 403 }
      );
    }

    // Check if worker has teamId assigned
    if (!workerData.teamId) {
      return NextResponse.json(
        { error: 'Worker not assigned to any team', code: 'NO_TEAM_ASSIGNED' },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [eq(reports.assignedTeamId, workerData.teamId)];

    if (status) {
      conditions.push(eq(reports.status, status));
    }

    if (severity) {
      conditions.push(eq(reports.severity, severity));
    }

    // Query reports table for tasks assigned to worker's team
    const tasks = await db.select()
      .from(reports)
      .where(and(...conditions))
      .orderBy(desc(reports.priorityScore), desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(tasks, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}