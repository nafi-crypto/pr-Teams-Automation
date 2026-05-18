import { NextRequest, NextResponse } from 'next/server';
import { simulateRouting } from '@/lib/routing-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, action, repoName } = body;

    if (!eventType || !repoName) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, repoName' },
        { status: 400 }
      );
    }

    const result = simulateRouting(eventType, action || '', repoName);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Simulation failed', details: error.message },
      { status: 500 }
    );
  }
}
