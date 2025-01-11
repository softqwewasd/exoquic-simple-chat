import { NextResponse } from 'next/server';

export async function POST(req) {
  const body = await req.json();
  
  // Here you would typically store the room information in a database
  // For now, we'll just return success
  
  return NextResponse.json({ success: true });
} 