import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reports, municipalityTeams, users } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

const ALLOWED_WASTE_TYPES = ['plastic', 'organic', 'metal', 'electronic', 'mixed', 'hazardous'];
const ALLOWED_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const ALLOWED_STATUSES = ['submitted', 'assigned', 'in_progress', 'resolved', 'rejected'];
const ALLOWED_BIODEGRADABLE = ['biodegradable', 'non-biodegradable'];

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
            Math.sin(dLng / 2) ** 2;
  
  const c = 2 * Math.asin(Math.sqrt(a));
  const distance = 6371 * c; // Earth radius in kilometers
  
  return Math.round(distance * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single report by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const report = await db
        .select()
        .from(reports)
        .where(eq(reports.id, parseInt(id)))
        .limit(1);

      if (report.length === 0) {
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(report[0], { status: 200 });
    }

    // List with filters and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const municipality = searchParams.get('municipality');
    const assignedTeamId = searchParams.get('assignedTeamId');

    let query = db.select().from(reports);

    // Build filter conditions
    const conditions = [];

    if (userId) {
      if (isNaN(parseInt(userId))) {
        return NextResponse.json(
          { error: 'Valid userId is required', code: 'INVALID_USER_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(reports.userId, parseInt(userId)));
    }

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json(
          { 
            error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`, 
            code: 'INVALID_STATUS' 
          },
          { status: 400 }
        );
      }
      conditions.push(eq(reports.status, status));
    }

    if (severity) {
      if (!ALLOWED_SEVERITIES.includes(severity)) {
        return NextResponse.json(
          { 
            error: `Invalid severity. Must be one of: ${ALLOWED_SEVERITIES.join(', ')}`, 
            code: 'INVALID_SEVERITY' 
          },
          { status: 400 }
        );
      }
      conditions.push(eq(reports.severity, severity));
    }

    if (municipality) {
      conditions.push(eq(reports.assignedMunicipality, municipality));
    }

    if (assignedTeamId) {
      if (isNaN(parseInt(assignedTeamId))) {
        return NextResponse.json(
          { error: 'Valid assignedTeamId is required', code: 'INVALID_TEAM_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(reports.assignedTeamId, parseInt(assignedTeamId)));
    }

    // Apply filters
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Sort by newest first and apply pagination
    const results = await query
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      photoUrl, 
      location, 
      wasteType,
      biodegradable,
      severity, 
      description, 
      priorityScore 
    } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (typeof userId !== 'number' || isNaN(userId)) {
      return NextResponse.json(
        { error: 'userId must be a valid integer', code: 'INVALID_USER_ID' },
        { status: 400 }
      );
    }

    if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') {
      return NextResponse.json(
        { error: 'photoUrl is required and must be a non-empty string', code: 'MISSING_PHOTO_URL' },
        { status: 400 }
      );
    }

    if (!location || typeof location !== 'object') {
      return NextResponse.json(
        { error: 'location is required and must be an object', code: 'MISSING_LOCATION' },
        { status: 400 }
      );
    }

    if (!location.lat || !location.lng || !location.address) {
      return NextResponse.json(
        { error: 'location must contain lat, lng, and address', code: 'INVALID_LOCATION' },
        { status: 400 }
      );
    }

    if (!wasteType || typeof wasteType !== 'string' || wasteType.trim() === '') {
      return NextResponse.json(
        { error: 'wasteType is required', code: 'MISSING_WASTE_TYPE' },
        { status: 400 }
      );
    }

    if (!ALLOWED_WASTE_TYPES.includes(wasteType)) {
      return NextResponse.json(
        { 
          error: `wasteType must be one of: ${ALLOWED_WASTE_TYPES.join(', ')}`, 
          code: 'INVALID_WASTE_TYPE' 
        },
        { status: 400 }
      );
    }

    if (!biodegradable || typeof biodegradable !== 'string' || biodegradable.trim() === '') {
      return NextResponse.json(
        { error: 'biodegradable is required', code: 'MISSING_BIODEGRADABLE' },
        { status: 400 }
      );
    }

    if (!ALLOWED_BIODEGRADABLE.includes(biodegradable)) {
      return NextResponse.json(
        { 
          error: `biodegradable must be one of: ${ALLOWED_BIODEGRADABLE.join(', ')}`, 
          code: 'INVALID_BIODEGRADABLE' 
        },
        { status: 400 }
      );
    }

    if (!severity || typeof severity !== 'string' || severity.trim() === '') {
      return NextResponse.json(
        { error: 'severity is required', code: 'MISSING_SEVERITY' },
        { status: 400 }
      );
    }

    if (!ALLOWED_SEVERITIES.includes(severity)) {
      return NextResponse.json(
        { 
          error: `severity must be one of: ${ALLOWED_SEVERITIES.join(', ')}`, 
          code: 'INVALID_SEVERITY' 
        },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json(
        { error: 'description is required and must be a non-empty string', code: 'MISSING_DESCRIPTION' },
        { status: 400 }
      );
    }

    if (!priorityScore || typeof priorityScore !== 'number') {
      return NextResponse.json(
        { error: 'priorityScore is required and must be a number', code: 'MISSING_PRIORITY_SCORE' },
        { status: 400 }
      );
    }

    if (priorityScore < 1 || priorityScore > 100) {
      return NextResponse.json(
        { error: 'priorityScore must be between 1 and 100', code: 'INVALID_PRIORITY_SCORE' },
        { status: 400 }
      );
    }

    // Create new report
    const now = new Date().toISOString();
    const newReport = await db
      .insert(reports)
      .values({
        userId,
        photoUrl: photoUrl.trim(),
        location: JSON.stringify(location),
        wasteType: wasteType.trim(),
        biodegradable: biodegradable.trim(),
        severity: severity.trim(),
        description: description.trim(),
        priorityScore,
        status: 'submitted',
        assignedTo: null,
        assignedMunicipality: null,
        resolvedAt: null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    const createdReport = newReport[0];

    // Auto-assign to nearest municipality team
    try {
      const activeTeams = await db.select()
        .from(municipalityTeams)
        .where(eq(municipalityTeams.status, 'active'));

      if (activeTeams.length > 0) {
        const reportLat = location.lat;
        const reportLng = location.lng;

        // Calculate distances for all active teams
        const teamsWithDistance = activeTeams.map(team => {
          const serviceArea = team.serviceArea as { lat: number; lng: number; radius?: number };
          const distance = calculateDistance(reportLat, reportLng, serviceArea.lat, serviceArea.lng);
          
          return { team, distance };
        });

        // Sort by distance ascending
        teamsWithDistance.sort((a, b) => a.distance - b.distance);
        const nearestTeam = teamsWithDistance[0];

        // Update report with assignment
        await db.update(reports)
          .set({
            assignedTeamId: nearestTeam.team.id,
            assignedMunicipality: nearestTeam.team.name,
            assignmentDate: now,
            status: 'assigned',
            updatedAt: now
          })
          .where(eq(reports.id, createdReport.id));

        // Update the created report object for response
        createdReport.assignedTeamId = nearestTeam.team.id;
        createdReport.assignedMunicipality = nearestTeam.team.name;
        createdReport.status = 'assigned';
        createdReport.assignmentDate = now;

        // Send email notification to municipality team
        try {
          await fetch(`${request.nextUrl.origin}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: nearestTeam.team.contactEmail,
              subject: `🚨 New Waste Report Assigned - Report #${createdReport.id}`,
              html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background: linear-gradient(135deg, #16a34a 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
                      .header h1 { margin: 0; font-size: 28px; }
                      .content { background: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; }
                      .alert-badge { background: #fef3c7; color: #92400e; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: bold; border: 2px solid #fbbf24; }
                      .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a; }
                      .details h3 { margin-top: 0; color: #16a34a; }
                      .detail-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
                      .detail-label { font-weight: bold; color: #374151; display: inline-block; min-width: 140px; }
                      .detail-value { color: #6b7280; }
                      .severity-high { color: #dc2626; font-weight: bold; }
                      .severity-critical { color: #991b1b; font-weight: bold; background: #fef2f2; padding: 2px 8px; border-radius: 4px; }
                      .severity-medium { color: #f59e0b; font-weight: bold; }
                      .severity-low { color: #16a34a; font-weight: bold; }
                      .action-button { display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                      .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; border-radius: 0 0 10px 10px; }
                      .icon { font-size: 48px; margin-bottom: 10px; }
                      .image-preview { max-width: 100%; border-radius: 8px; margin: 15px 0; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <div class="icon">♻️</div>
                        <h1>CleanUp Connect</h1>
                        <p>New Waste Report Assigned to Your Team</p>
                      </div>
                      <div class="content">
                        <div class="alert-badge">
                          🚨 ACTION REQUIRED - New Report Assigned
                        </div>
                        <p>Hello <strong>${nearestTeam.team.name}</strong> Team,</p>
                        <p>A new waste report has been submitted and automatically assigned to your municipality team based on the location. Please review and take appropriate action.</p>
                        
                        <div class="details">
                          <h3>📋 Report Details</h3>
                          <div class="detail-row">
                            <span class="detail-label">Report ID:</span>
                            <span class="detail-value">#${createdReport.id}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Waste Type:</span>
                            <span class="detail-value">${wasteType.charAt(0).toUpperCase() + wasteType.slice(1)}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Biodegradable:</span>
                            <span class="detail-value">${biodegradable === 'biodegradable' ? '✅ Yes' : '❌ No'}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Severity Level:</span>
                            <span class="detail-value severity-${severity}">${severity.toUpperCase()}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Priority Score:</span>
                            <span class="detail-value">${priorityScore}/100</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Location:</span>
                            <span class="detail-value">${location.address}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Coordinates:</span>
                            <span class="detail-value">${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Distance:</span>
                            <span class="detail-value">${nearestTeam.distance.toFixed(2)} km from your service area</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Description:</span>
                            <span class="detail-value">${description}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Submitted:</span>
                            <span class="detail-value">${new Date(now).toLocaleString()}</span>
                          </div>
                        </div>

                        <div class="details">
                          <h3>📸 Waste Photo</h3>
                          <img src="${photoUrl}" alt="Waste Report Photo" class="image-preview" />
                        </div>
                        
                        <p><strong>Next Steps:</strong></p>
                        <ul>
                          <li>🔍 Review the report details and photo</li>
                          <li>👥 Assign a worker to handle this report</li>
                          <li>📍 Verify the location and plan the cleanup</li>
                          <li>🚚 Dispatch your team to resolve the issue</li>
                          <li>✅ Update the status once completed</li>
                        </ul>
                        
                        <div style="text-align: center;">
                          <a href="${request.nextUrl.origin}/municipality" class="action-button">
                            View Report in Dashboard →
                          </a>
                        </div>
                      </div>
                      <div class="footer">
                        <p><strong>CleanUp Connect</strong></p>
                        <p>Municipality Team Dashboard</p>
                        <p style="font-size: 12px; margin-top: 15px;">
                          This is an automated notification. Please log in to your dashboard to manage this report.
                        </p>
                      </div>
                    </div>
                  </body>
                </html>
              `,
            }),
          });
          console.log(`Email sent to municipality: ${nearestTeam.team.contactEmail}`);
        } catch (emailError) {
          console.error('Failed to send municipality email:', emailError);
          // Don't fail the request if email fails
        }

        // Send confirmation email to citizen
        try {
          const citizen = await db.select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          if (citizen.length > 0 && citizen[0].email) {
            await fetch(`${request.nextUrl.origin}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: citizen[0].email,
                subject: `✅ Report Submitted Successfully - Report #${createdReport.id}`,
                municipalityName: nearestTeam.team.name,
                reportDetails: {
                  id: createdReport.id,
                  wasteType: wasteType.charAt(0).toUpperCase() + wasteType.slice(1),
                  severity: severity.toUpperCase(),
                  address: location.address,
                  carbonFootprint: createdReport.carbonFootprintKg || 0,
                },
              }),
            });
            console.log(`Confirmation email sent to citizen: ${citizen[0].email}`);
          }
        } catch (emailError) {
          console.error('Failed to send citizen confirmation email:', emailError);
          // Don't fail the request if email fails
        }
      }
    } catch (assignError) {
      console.error('Failed to auto-assign report:', assignError);
      // Don't fail the request if auto-assignment fails
    }

    return NextResponse.json(createdReport, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}