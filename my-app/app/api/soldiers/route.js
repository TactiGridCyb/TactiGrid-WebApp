// app/api/soldiers/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';          // your helper
import Soldier   from '@/models/Soldier';         // a simple Mongoose model

// GET /api/soldiers?search=abc            ← fuzzy search by name (case-insensitive)
// GET /api/soldiers?all=1                 ← list all (capped at 200)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const term   = (searchParams.get('search') || '').trim();
  const listAll = searchParams.has('all');

  await dbConnect();

  /* build query */
  let query = {};
  if (!listAll) {
    const regex = new RegExp(term, 'i');                 // case-insensitive
    query = {
      $or: [
        { fullName: regex },
        { IDF_ID:   regex },
        { CITIZEN_ID: regex },
      ],
    };
  }
  const role = searchParams.get('role') || 'Soldier';   // default soldiers
query.role = role;
  const docs = await Soldier
    .find(query, '_id fullName IDF_ID role')             // project only what UI needs
    .limit(listAll ? 200 : 25);

  return NextResponse.json(docs);
}