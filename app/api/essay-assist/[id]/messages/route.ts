import { NextRequest, NextResponse } from 'next/server';
import { db } from 'db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { role, content, highlights = [] } = await request.json();

    if (!role || !content) {
      return NextResponse.json({ error: 'Role and content are required' }, { status: 400 });
    }

    // Verify essay assist ownership
    const essayAssist = await db.essayAssist.findFirst({
      where: {
        id: params.id,
      },
    });

    if (!essayAssist) {
      return NextResponse.json({ error: 'Essay assist not found' }, { status: 404 });
    }

    const message = await db.essayAssistMessage.create({
      data: {
        essayAssistId: params.id,
        role,
        content,
        highlights,
      },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Message creation error:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
