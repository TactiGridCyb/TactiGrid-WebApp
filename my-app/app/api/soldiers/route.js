// app/api/soldiers/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';          
import Soldier   from '@/models/Soldier';         


export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const term   = (searchParams.get('search') || '').trim();
  const listAll = searchParams.has('all');

  await dbConnect();


  let query = {};
  if (!listAll) {
    const regex = new RegExp(term, 'i');                
    query = {
      $or: [
        { fullName: regex },
        { IDF_ID:   regex },
        { CITIZEN_ID: regex },
      ],
    };
  }
  const role = searchParams.get('role') || 'Soldier';   
query.role = role;
  const docs = await Soldier
    .find(query, '_id fullName IDF_ID role')            
    .limit(listAll ? 200 : 25);

  return NextResponse.json(docs);
}