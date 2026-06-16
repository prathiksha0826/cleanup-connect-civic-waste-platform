import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID is a valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const organizationId = parseInt(id);

    // Query database for organization with that ID
    const organization = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    // Return 404 if organization not found
    if (organization.length === 0) {
      return NextResponse.json(
        { 
          error: 'Organization not found',
          code: 'ORGANIZATION_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Return 200 with organization object
    return NextResponse.json(organization[0], { status: 200 });

  } catch (error) {
    console.error('GET organization error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}