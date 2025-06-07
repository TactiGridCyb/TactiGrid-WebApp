import { NextResponse }         from 'next/server';
import { uploadsAllowed,
         setUploadsAllowed }    from '@/lib/uploadGate';

export const POST = () => {
  const armed = !uploadsAllowed();   // flip
  setUploadsAllowed(armed);
  return NextResponse.json({ armed });   // { armed: true | false }
};
