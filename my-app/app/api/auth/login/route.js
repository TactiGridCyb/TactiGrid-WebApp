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

  if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
    return NextResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  }

  const token = jwt.sign(
    { sub: user._id.toString(), name: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );


  const res = NextResponse.json({ success: true, user: { email: user.email } });

  res.cookies.set({
    name: 'authToken',
    value: token,
    httpOnly: true,          
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 
  });

  return res;
}
