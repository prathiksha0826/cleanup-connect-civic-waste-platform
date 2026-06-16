import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const id = pathSegments[pathSegments.length - 1];

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const report = await db.select()
      .from(reports)
      .where(eq(reports.id, parseInt(id)))
      .limit(1);

    if (report.length === 0) {
      return NextResponse.json({ 
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(report[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const id = pathSegments[pathSegments.length - 1];

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    const { status, assignedTo, assignedMunicipality, severity, priorityScore, resolvedAt } = body;

    if (status && !['submitted', 'assigned', 'in_progress', 'resolved', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status value. Must be one of: submitted, assigned, in_progress, resolved, rejected",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    if (severity && !['low', 'medium', 'high', 'critical'].includes(severity)) {
      return NextResponse.json({ 
        error: "Invalid severity value. Must be one of: low, medium, high, critical",
        code: "INVALID_SEVERITY" 
      }, { status: 400 });
    }

    if (priorityScore !== undefined && (priorityScore < 1 || priorityScore > 100)) {
      return NextResponse.json({ 
        error: "Priority score must be between 1 and 100",
        code: "INVALID_PRIORITY_SCORE" 
      }, { status: 400 });
    }

    if (assignedTo !== undefined && assignedTo !== null && (!Number.isInteger(assignedTo) || assignedTo < 0)) {
      return NextResponse.json({ 
        error: "Assigned to must be a valid positive integer",
        code: "INVALID_ASSIGNED_TO" 
      }, { status: 400 });
    }

    const existingReport = await db.select()
      .from(reports)
      .where(eq(reports.id, parseInt(id)))
      .limit(1);

    if (existingReport.length === 0) {
      return NextResponse.json({ 
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND' 
      }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (status !== undefined) updates.status = status;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (assignedMunicipality !== undefined) updates.assignedMunicipality = assignedMunicipality;
    if (severity !== undefined) updates.severity = severity;
    if (priorityScore !== undefined) updates.priorityScore = priorityScore;
    if (resolvedAt !== undefined) updates.resolvedAt = resolvedAt;

    if (status === 'resolved' && !resolvedAt && !existingReport[0].resolvedAt) {
      updates.resolvedAt = new Date().toISOString();
    }

    const updated = await db.update(reports)
      .set(updates)
      .where(eq(reports.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const id = pathSegments[pathSegments.length - 1];

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const existingReport = await db.select()
      .from(reports)
      .where(eq(reports.id, parseInt(id)))
      .limit(1);

    if (existingReport.length === 0) {
      return NextResponse.json({ 
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND' 
      }, { status: 404 });
    }

    await db.delete(reports)
      .where(eq(reports.id, parseInt(id)));

    return NextResponse.json({ 
      message: "Report deleted successfully", 
      deletedId: parseInt(id) 
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}