// app/api/users/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();

    const users = await User.find({});

    return NextResponse.json({ success: true, users }, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();

    const { name, email } = await request.json();
    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: 'Missing name or email' },
        { status: 400 }
      );
    }

    const newUser = await User.create({ name, email });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}
