/**
 * Server-side helper that returns
 *   { _id, email }          ← if the caller is signed-in
 *   null                    ← if no / bad / expired token
 *
 * Usage (in any route):
 *   const me = await requireUser();
 *   if (!me) return NextResponse.redirect('/login');
 */
import { cookies }   from 'next/headers';
import jwt           from 'jsonwebtoken';
import dbConnect     from './mongoose.js';
import User          from '@/models/User.js';

export async function requireUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('authToken')?.value;
  if (!token) return null;

  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    await dbConnect();
    const user = await User.findById(sub).lean();
    return user ? { _id: user._id.toString(), email: user.email } : null;
  } catch {
    /* wipe the bad cookie so the client logs out next render */
    cookies().set('authToken', '', { maxAge: 0, path: '/' });
    return null;
  }
}
