'use client';

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from "ai";
import { Brain, CopyIcon } from 'lucide-react';
import { memo, useCallback, useContext, useEffect, useState } from "react";

import { Conversation, ConversationContent, } from "@/components/ai-elements/conversation";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse, MessageToolbar } from "@/components/ai-elements/message";
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { StarsIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WritingContext } from "@/contexts/writing-context";
import { cn } from "@/lib/utils";

import ChatInput from "../chat/ChatInput";

interface WritingAssistantProps {
    className?: string;
}

const actions = [
    {
        key: 'think',
        label: "深度思考",
        icon: <Brain />,
        tooltip: "先检索已发布的文章摘要，再进行创作",
    },
    {
        key: 'polish',
        label: "润色",
        icon: <Brain />,
        tooltip: "对现有内容进行润色",
    },
    {
        key: 'continue',
        label: "续写",
        icon: <Brain />,
        tooltip: "根据现有内容，继续创作",
    },
];

type ActionKey = typeof actions[number]['key']

const activeClassName = 'text-red-500 bg-red-50 border border-red-300 dark:border-red-500 hover:text-red-500'

export default function WritingAssistant({ className }: WritingAssistantProps) {
    const [isThink, setIsThink] = useState<boolean>(true);
    const [writeMode, setWriteMode] = useState<ActionKey>('continue');
    const { work, chapters, selectedItem } = useContext(WritingContext);


    const { messages, sendMessage, status, stop } = useChat({
        transport: new DefaultChatTransport({ api: '/api/write' }),
    });

    const handleSend = useCallback((message: string) => {
        sendMessage({ text: message }, {
            body: {
                workId: work?.id || '',
                chapterId: selectedItem?.id || '',
                message,
                content: selectedItem?.content || '',
                think: isThink,
                mode: writeMode,
            }
        })
    }, [sendMessage, work?.id, selectedItem?.id, selectedItem?.content, isThink, writeMode])

    const ChatInputActions = (
        <div className="flex gap-2">
            <Tooltip key="think">
                <TooltipTrigger asChild>
                    <Button
                        className={cn("rounded-full", { [activeClassName]: isThink })}
                        variant="outline"
                        onClick={() => setIsThink(v => !v)}
                    >
                        <Brain />
                        <div className="hidden @min-3xs/chat:block">深度思考</div>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>先检索已发布的文章摘要，再进行创作</TooltipContent>
            </Tooltip>
            <ToggleGroup variant="outline" type="single" value={writeMode} onValueChange={setWriteMode}>
                <ToggleGroupItem value="polish" aria-label="Toggle  polish">
                    润色
                </ToggleGroupItem>
                <ToggleGroupItem value="continue" aria-label="Toggle continue">
                    续写
                </ToggleGroupItem>
            </ToggleGroup>
        </div >
    )

    return (
        <div className={cn("flex flex-col", className)}>
            <div className="flex items-center p-6 border-b border-slate-100">
                <StarsIcon className="text-red-500 w-[22px] h-[22px]" />
                <p className="ml-2 text-base font-bold">AI 助手</p>
            </div>

            <div className="flex-1 overflow-y-hidden bg-slate-50">
                <Conversation className="relative size-full">
                    <ConversationContent className="p-6">
                        {
                            messages.map((message) => (
                                <Message from={message.role} key={message.id}>
                                    <MessageContent>
                                        {message.parts.map((part, i) => {
                                            switch (part.type) {
                                                case "text": // we don't use any reasoning or tool calls in this example
                                                    return (
                                                        <>
                                                            <MessageResponse key={`${message.id}-${i}`}>
                                                                {part.text}
                                                            </MessageResponse>
                                                            {message.role === 'assistant' && part.state === 'done' && (
                                                                <MessageToolbar className="mt-0 justify-end">
                                                                    <MessageActions>
                                                                        <CopyAction content={part.text} />
                                                                    </MessageActions>
                                                                </MessageToolbar>
                                                            )}
                                                        </>
                                                    );
                                                case 'reasoning':
                                                    return (
                                                        <Reasoning className="w-full" isStreaming={status === 'streaming' && part.state === 'streaming'}>
                                                            <ReasoningTrigger />
                                                            <ReasoningContent>{part.text}</ReasoningContent>
                                                        </Reasoning>
                                                    );
                                                default:
                                                    return null;
                                            }
                                        })}
                                    </MessageContent>
                                </Message>
                            ))
                        }
                    </ConversationContent>
                </Conversation>
            </div>
            <div className="p-6 border-t border-slate-100">
                <ChatInput
                    status={status}
                    placeholder="给写作助手发送消息"
                    actions={ChatInputActions}
                    onSend={handleSend}
                    onAbort={stop}
                />
            </div>
        </div>
    );
}

const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
};

const CopyAction = memo(({ content }: { content: string }) => {
    const handleClick = useCallback(() => handleCopy(content), [content]);
    return (
        <MessageAction
            label="Copy"
            onClick={handleClick}
            tooltip="复制"
        >
            <CopyIcon className="size-4" />
        </MessageAction>
    );
});

CopyAction.displayName = "CopyAction";