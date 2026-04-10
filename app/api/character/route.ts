'use server';

import { streamText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getModelClient } from '@/lib/ai/llmClient';
import { buildCharacterGenerationPrompt } from '@/lib/ai/promptEngine';


export async function POST(req: NextRequest) {
    const { category, theme, world, input, metadata } = (await req.json()) as {
        category?: string;
        theme?: string;
        world?: string;
        input: string;
        metadata: {
            name: string;
            gender: string;
            age: number;
            roleArchetype: string;
            personality: string;
            abilities: string;
            relationships: string;
            speechStyle: string;
            background: string;
        }
    };

    if (!input) {
        return NextResponse.json({ error: "缺少输入" }, { status: 400 });
    }

    const prompt = buildCharacterGenerationPrompt({
        category,
        theme,
        world,
        input,
        metadata,
    });

    const model = getModelClient()

    const result = streamText({
        model,
        system: `你是一名经验丰富的中文小说角色设计师...`,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ],
        tools: {
            deliver_character_metadata: {
                description: '传递角色的完整结构化数据，不展示给用户',
                inputSchema: z.object({
                    name: z.string(),
                    gender: z.string(),
                    age: z.number(),
                    roleArchetype: z.string(),
                    personality: z.string(),
                    abilities: z.string(),
                    relationships: z.string(),
                    speechStyle: z.string(),
                    background: z.string(),
                }),
            },
        },
    });


    return result.toUIMessageStreamResponse()
}