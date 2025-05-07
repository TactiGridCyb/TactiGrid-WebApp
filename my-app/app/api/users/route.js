// app/api/users/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

// GET /api/users
export async function GET() {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Fetch all users
    const users = await User.find({});

    // Return JSON response with status 200
    return NextResponse.json({ success: true, users }, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/users
export async function POST(request) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Parse request body
    const { name, email } = await request.json();
    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: 'Missing name or email' },
        { status: 400 }
      );
    }

    // Create new user document
    const newUser = await User.create({ name, email });

    // Return the newly created user
    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}
