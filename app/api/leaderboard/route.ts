import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate limit parameter
    const limitParam = searchParams.get('limit');
    let limit = 10; // default
    
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit)) {
        return NextResponse.json({ 
          error: "Limit must be a valid number",
          code: "INVALID_LIMIT" 
        }, { status: 400 });
      }
      if (parsedLimit > 50) {
        return NextResponse.json({ 
          error: "Limit cannot exceed 50",
          code: "LIMIT_EXCEEDED" 
        }, { status: 400 });
      }
      limit = parsedLimit;
    }
    
    // Parse and validate role parameter
    const roleParam = searchParams.get('role');
    if (roleParam && roleParam !== 'citizen' && roleParam !== 'municipality') {
      return NextResponse.json({ 
        error: "Role must be either 'citizen' or 'municipality'",
        code: "INVALID_ROLE" 
      }, { status: 400 });
    }
    
    // Build query
    let query = db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      municipalityName: users.municipalityName,
      points: users.points,
      badges: users.badges,
      createdAt: users.createdAt
    })
    .from(users)
    .orderBy(desc(users.points));
    
    // Apply role filter if provided
    if (roleParam) {
      query = query.where(eq(users.role, roleParam));
    }
    
    // Apply limit
    const results = await query.limit(limit);
    
    // Add rank to each user
    const leaderboard = results.map((user, index) => ({
      rank: index + 1,
      ...user
    }));
    
    return NextResponse.json(leaderboard, { status: 200 });
    
  } catch (error) {
    console.error('GET leaderboard error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}