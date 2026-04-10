"use client";

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";

import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import ChatInput from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export interface WorldMetadata {
    content: string;
    metadata: {
        summary: string;
        world: string;
        system: string;
        factions: Array<{
            name: string;
            description: string;
            goal: string;
        }>;
        conflict: string;
        tone: string;
    }
}

export interface CreateWorldProps {
    category?: string;
    theme?: string;
    onClose?: () => void;
    onSubmit?: (data: WorldMetadata) => void;
}

export default function CreateWorld({ category, theme, onClose, onSubmit }: CreateWorldProps) {
    const [open, setOpen] = useState(true)

    useEffect(() => {
        if (!open) {
            onClose?.();
        }
    }, [open, onClose]);

    const { messages, sendMessage, status, stop } = useChat({
        transport: new DefaultChatTransport({ api: '/api/world' }),
        onToolCall: ({ toolCall }) => {
            // 可选：处理工具调用，比如自动返回结果
            console.log("收到工具调用:", toolCall);
            setWorldMetadata(toolCall.input as WorldMetadata['metadata']);
        },
        onFinish: () => {
            const assistantText = latestMessage.parts.filter((part) => part.type === 'text').map((part) => part.text).join('');
            setAssistantText(assistantText);
        }
    });


    const [assistantText, setAssistantText] = useState("");
    const [worldMetadata, setWorldMetadata] = useState<WorldMetadata['metadata']>({
        summary: "",
        world: "",
        system: "",
        factions: [],
        conflict: "",
        tone: "",
    });

    const handleSend = (input: string) => {
        sendMessage(
            { text: input },
            {
                body: {
                    category,
                    theme,
                    input,
                },
            }
        );
    };

    const handleSave = () => {
        onSubmit?.({
            content: assistantText,
            metadata: worldMetadata
        });
    }

    const latestMessage = messages[messages.length - 1];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:!max-w-4xl !max-w-4xl">
                <DialogHeader>
                    <DialogTitle>编辑世界设定</DialogTitle>
                </DialogHeader>
                <div className="h-140 max-h-[70vh] overflow-y-auto  flex flex-col border border-gray-200 p-3 bg-gray-100 rounded-sm">
                    <div className="flex-1 mb-2 overflow-y-hidden">
                        <Conversation className="relative size-full">
                            <ConversationContent>
                                <Message from="assistant">
                                    <MessageContent>
                                        {latestMessage?.role === 'assistant' ? latestMessage.parts.map(
                                            (part, i) => {
                                                switch (part.type) {
                                                    case 'text':
                                                        return <MessageResponse key={i}>{part.text}</MessageResponse>
                                                    case 'tool-deliver_world_metadata':
                                                        return (
                                                            <MessageActions>
                                                                {status === 'streaming' && <p className="text-sm text-gray-500">正在整理结构化数据...</p>}
                                                                {status === 'ready' && <Button className="ml-auto cursor-pointer" onClick={handleSave}>一键应用</Button>}
                                                            </MessageActions>
                                                        )
                                                    default:
                                                        return null;
                                                }
                                            }
                                        ) : null}
                                    </MessageContent>
                                </Message>
                            </ConversationContent>
                        </Conversation>
                    </div>
                    <ChatInput placeholder="您可以输入基本描述，我将为您生成世界设定。" onSend={handleSend} onAbort={() => stop()} status={status} />
                </div>
            </DialogContent>
        </Dialog>
    )
}