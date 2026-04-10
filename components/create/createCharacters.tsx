'use client';

import { useChat } from '@ai-sdk/react'
import { zodResolver } from "@hookform/resolvers/zod"
import { DefaultChatTransport } from "ai";
import { convertSegmentPathToStaticExportFilename } from "next/dist/shared/lib/segment-cache/segment-value-encoding";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form"
import * as z from "zod";

import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import ChatInput from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Character } from "@/types/writing";

interface CreateCharactersProps {
    visible?: boolean;
    type: 'add' | 'edit';
    onSubmit?: (values: FormValues) => void;
    onCancel?: () => void;
    defaultValues?: FormValues | null;
    context?: {
        category?: string;
        theme?: string;
        world?: string;
    }
}

export const formSchema = z.object({
    name: z.string().min(1, ""),
    gender: z.string().min(1, ""),
    age: z.number(),
    roleArchetype: z.string().min(1, ""),
    personality: z.string().min(1, ""),
    abilities: z.string().min(1, ""),
    relationships: z.string().min(1, ""),
    speechStyle: z.string().min(1, ""),
    background: z.string().min(1, ""),
})

export type FormValues = z.infer<typeof formSchema>

export default function CreateCharacters({
    visible = false,
    type = 'add',
    defaultValues = undefined,
    context = {},
    onSubmit = () => { },
    onCancel = () => { },
}: CreateCharactersProps) {
    const [open, setOpen] = useState(true)

    useEffect(() => {
        if (!open) {
            onCancel?.();
        }
    }, [open, onCancel]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: (type === 'edit' && defaultValues) ? { ...defaultValues } : {
            name: "",
            gender: "",
            age: 18,
            roleArchetype: "",
            personality: "",
            abilities: "",
            relationships: "",
            speechStyle: "",
            background: ""
        },
    })

    const { messages, sendMessage, status, stop } = useChat({
        transport: new DefaultChatTransport({ api: '/api/character' }),
        onToolCall: ({ toolCall }) => {
            // 可选：处理工具调用，比如自动返回结果
            console.log("收到工具调用:", toolCall);
            setCharacterFormValues(toolCall.input as FormValues);
        },
        onFinish: ({ message }) => {
        }
    });

    const [characterFormValues, setCharacterFormValues] = useState<FormValues | null>(null);

    const handleSend = (input: string) => {
        const { category, theme, world } = context ?? {};
        const { name, gender, age, roleArchetype, personality, abilities, relationships, speechStyle, background } = form.getValues();
        sendMessage(
            { text: input },
            {
                body: {
                    category,
                    theme,
                    world,
                    input,
                    metadata: {
                        name,
                        gender,
                        age,
                        roleArchetype,
                        personality,
                        abilities,
                        relationships,
                        speechStyle,
                        background,
                    },
                },
            }
        );
    };

    const handleSave = () => {
        form.reset(characterFormValues ? { ...characterFormValues } : {});
    }

    const latestMessage = messages[messages.length - 1];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:!max-w-4xl !max-w-4xl">
                <DialogHeader>
                    <DialogTitle>编辑角色</DialogTitle>
                    <DialogDescription>
                        填写角色名称与性格特征，保存后将写入角色列表。
                    </DialogDescription>
                </DialogHeader>

                <div className="content-wrap w-full h-150 grid grid-cols-2 gap-3 overflow-hidden">
                    <div className="content-left flex flex-col border border-gray-200 p-3 bg-white rounded-sm">
                        <form className="py-2 flex-1" id="form-create-character" onSubmit={form.handleSubmit(onSubmit)}>
                            <FieldGroup>
                                <Controller
                                    name="name"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                            <FieldLabel htmlFor={field.name} className="!flex-none w-20 justify-end">
                                                姓名：
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id={field.name}
                                                aria-invalid={fieldState.invalid}
                                                placeholder="例如：林小雨"
                                                autoComplete="off"
                                                onClick={() => console.log(111)}
                                            />
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="gender"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                            <FieldLabel htmlFor={field.name} className="!flex-none w-20 justify-end">
                                                性别：
                                            </FieldLabel>
                                            <Select
                                                name={field.name}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger aria-invalid={fieldState.invalid} className="flex-1">
                                                    <SelectValue placeholder="选择性别" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="男">男</SelectItem>
                                                    <SelectItem value="女">女</SelectItem>
                                                    <SelectItem value="未知">未知</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="age"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                            <FieldLabel htmlFor={field.name} className="!flex-none w-20 justify-end">
                                                年龄：
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id={field.name}
                                                aria-invalid={fieldState.invalid}
                                                autoComplete="off"
                                                type="number"
                                                onChange={(e) => {
                                                    const val = e.target.valueAsNumber;
                                                    field.onChange(isNaN(val) ? undefined : val);
                                                }}
                                            />
                                        </Field>
                                    )}
                                />


                                <Controller
                                    name="roleArchetype"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                            <FieldLabel htmlFor={field.name} className="!flex-none w-20 justify-end">
                                                角色：
                                            </FieldLabel>
                                            <Select
                                                name={field.name}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger aria-invalid={fieldState.invalid} className="flex-1">
                                                    <SelectValue placeholder="选择角色类型" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="主角" key="主角">主角</SelectItem>
                                                    <SelectItem value="配角" key="配角">配角</SelectItem>
                                                    <SelectItem value="正派" key="正派">正派</SelectItem>
                                                    <SelectItem value="反派" key="反派">反派</SelectItem>
                                                    <SelectItem value="路人" key="路人">路人</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="personality"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                            <FieldLabel htmlFor={field.name} className="!flex-none w-20 justify-end">
                                                性格：
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id={field.name}
                                                aria-invalid={fieldState.invalid}
                                                placeholder="冷静、敏锐、克制"
                                                autoComplete="off"
                                            />
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="abilities"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                            <FieldLabel htmlFor={field.name} className="!flex-none w-20 justify-end">
                                                能力：
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id={field.name}
                                                aria-invalid={fieldState.invalid}
                                                placeholder="特殊能力、金手指、武功"
                                                autoComplete="off"
                                            />
                                        </Field>
                                    )}
                                />

                                <Controller
                                    name="relationships"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                            <FieldLabel htmlFor={field.name} className="!flex-none w-20 justify-end">
                                                关系：
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id={field.name}
                                                aria-invalid={fieldState.invalid}
                                                placeholder="与主角、配角、反派、路人之间的关系"
                                                autoComplete="off"
                                            />
                                        </Field>
                                    )}
                                />

                                <Controller
                                    name="background"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                            <FieldLabel htmlFor={field.name} className="!flex-none w-20 justify-end">
                                                背景：
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id={field.name}
                                                aria-invalid={fieldState.invalid}
                                                placeholder="背景故事、家庭背景、成长经历"
                                                autoComplete="off"
                                            />
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="speechStyle"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                            <FieldLabel htmlFor={field.name} className="!flex-none w-20 justify-end">
                                                语言风格：
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id={field.name}
                                                aria-invalid={fieldState.invalid}
                                                placeholder="口语化、书面语、方言"
                                                autoComplete="off"
                                            />
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                        </form>
                        <Button type="submit" form="form-create-character" className="w-full">保存</Button>
                    </div>
                    <div className="content-right overflow-hidden flex flex-col border border-gray-200 p-3 bg-gray-100 rounded-sm">
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
                                                        case 'tool-deliver_character_metadata':
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
                        <ChatInput placeholder="您可以输入角色描述，我将根据已有信息生成内容。" status={status} onSend={handleSend} onAbort={() => stop()} />
                    </div>
                </div>


            </DialogContent>
        </Dialog>
    )
}