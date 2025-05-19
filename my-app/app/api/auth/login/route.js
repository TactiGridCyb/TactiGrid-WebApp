import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import bcrypt from 'bcrypt';

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { success: false, message: 'Email and password are required' },
      { status: 400 }
    );
  }

  await dbConnect();
  const user = await User.findOne({ email }).lean();

  // No such user or bad password ➜ 401
  if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
    return NextResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // Build JWT payload (keep it small!)
  const token = jwt.sign(
    { sub: user._id.toString(), name: user.email }, // or user.name if you add it
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Send cookie + small public part of user
  const res = NextResponse.json({ success: true, user: { email: user.email } });

  res.cookies.set({
    name: 'authToken',
    value: token,
    httpOnly: true,          // not accessible from JS
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });

  return res;
}
