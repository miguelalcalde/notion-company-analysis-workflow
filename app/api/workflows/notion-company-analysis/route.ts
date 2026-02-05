import { start } from 'workflow/api';
import { notionCompanyAnalysisWorkflow } from '@/workflows/notion-company-analysis';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Start the workflow execution
    await start(notionCompanyAnalysisWorkflow, [body]);
    
    return NextResponse.json({
      success: true,
      message: 'Workflow started successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
