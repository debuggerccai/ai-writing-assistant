'use server';

import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getDefaultConfig, getModelClient } from '@/lib/ai/llmClient';
import { buildWorldGenerationPrompt } from '@/lib/ai/promptEngine';



export async function POST(req: NextRequest) {

    const { category, theme, input } = (await req.json()) as {
        category?: string;
        theme?: string;
        input?: string;
    };

    if (!category && !theme && !input) {
        return NextResponse.json({ error: "缺少分类、主题或输入" }, { status: 400 });
    }

    const prompt = buildWorldGenerationPrompt({
        category,
        theme,
        input,
    });

    const model = getModelClient()

    const result = streamText({
        model,
        system: `你是一名经验丰富的中文小说世界观设计师...`,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ],
        tools: {
            deliver_world_metadata: {
                description: '传递世界观的完整结构化数据，不展示给用户',
                inputSchema: z.object({
                    summary: z.string(),
                    world: z.string(),
                    system: z.string(),
                    factions: z.array(z.object({
                        name: z.string(),
                        description: z.string(),
                        goal: z.string(),
                    })),
                    conflict: z.string(),
                    tone: z.string(),
                }),
            },
        },
    });


    return result.toUIMessageStreamResponse()
}