import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('authToken')?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    await dbConnect();
    const user = await User.findById(sub).lean();
    return NextResponse.json({ user: user ? { email: user.email } : null });
  } catch {
    // bad/expired token ➜ clear cookie
    const res = NextResponse.json({ user: null });
    res.cookies.set('authToken', '', { maxAge: 0, path: '/' });
    return res;
  }
}
