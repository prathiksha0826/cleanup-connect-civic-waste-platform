import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function GET(request: NextRequest) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          error: 'Authorization token is required',
          code: 'MISSING_TOKEN' 
        },
        { status: 401 }
      );
    }

    // Extract token
    const token = authHeader.substring(7);

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Check if user is super-admin
      if (decoded.role !== 'super-admin') {
        return NextResponse.json(
          {
            error: 'Not authorized as super-admin',
            code: 'NOT_SUPER_ADMIN'
          },
          { status: 403 }
        );
      }

      // Return verification success
      return NextResponse.json(
        {
          isAdmin: true,
          user: {
            id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role
          }
        },
        { status: 200 }
      );
    } catch (jwtError) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN' 
        },
        { status: 401 }
      );
    }

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