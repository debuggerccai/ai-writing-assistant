'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { Brain, Mars, NonBinary, PencilRuler, PenLine, Trash, UserPlus, Users, Venus } from "lucide-react";
import { useRouter } from 'next/navigation'
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea";
import { Character } from "@/types/writing";

import CreateCharacters, { formSchema as characterFormSchema } from "./create-characters";
import CreateWorld, { WorldMetadata } from "./create-world";

function RequiredAsterisk() {
    return (
        <span aria-hidden="true" className="text-red-500">
            *
        </span>
    );
}

const categoryOptions = ["武侠小说", "推理小说", "科幻小说", "悬疑小说", "历史小说", "言情小说"]

const formSchema = z.object({
    category: z.string().min(1, "请选择小说类型"),
    theme: z.string().min(1, "请输入主题"),
    world: z.string().min(1, "请输入故事背景设定"),
    characters: z.array(characterFormSchema).min(1),
})

export type FormValues = z.infer<typeof formSchema>

const initialFormValues: FormValues = {
    category: "",
    theme: "",
    world: "",
    characters: [],
}

export default function CreateNovel() {
    const router = useRouter()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialFormValues,
    })

    const [submitError, setSubmitError] = useState<string | null>(null);

    const onSubmit = async (values: FormValues) => {
        setSubmitError(null);
        try {
            const response = await fetch("/api/novels", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
            });

            const raw = await response.text();
            let result: { error?: string; work?: unknown } = {};
            try {
                result = raw ? JSON.parse(raw) : {};
            } catch {
                throw new Error(response.status === 404 ? "接口不存在，请检查前端请求路径" : "服务器返回了非 JSON 响应");
            }

            if (!response.ok) {
                throw new Error(result.error || `创建作品失败（${response.status}）`);
            }

            // 创建成功后先清空当前页状态，避免路由缓存复用时保留旧输入
            form.reset(initialFormValues);
            setCharacterDialogObject({ visible: false, type: "add", editIndex: undefined, defaultValues: null, context: {} });
            setShowCreateWorld(false);
            router.push("/novels");
        } catch (error) {
            const message = error instanceof Error ? error.message : "创建作品失败";
            setSubmitError(message);
            console.error("创建作品失败:", error);
        }
    }

    const [characterDialogObject, setCharacterDialogObject] = useState<{
        visible: boolean,
        type: "add" | "edit",
        editIndex?: number,
        defaultValues: FormValues['characters'][number] | null,
        context: {
            category?: string;
            theme?: string;
            world?: string;
        }
    }>({ visible: false, type: "add", defaultValues: null, context: {} });

    const onEditCharacter = (character: FormValues['characters'][number], index: number) => {
        setCharacterDialogObject({
            visible: true,
            type: 'edit',
            editIndex: index,
            defaultValues: {
                ...character,
            },
            context: {
                category: form.getValues("category"),
                theme: form.getValues("theme"),
                world: form.getValues("world"),
            }
        });
    }

    const onDeleteCharacter = (index: number) => {
        const current = form.getValues("characters") ?? [];
        form.setValue("characters", current.filter((_, i) => i !== index), {
            shouldValidate: true,
        });
    }

    const onCancelCharacter = () => {
        setCharacterDialogObject({ visible: false, type: "add", editIndex: undefined, defaultValues: null, context: {} });
    }

    const onSubmitCharacter = (values: FormValues['characters'][number]) => {
        if (characterDialogObject.type === "add") {
            const current = form.getValues("characters") ?? [];
            form.setValue("characters", [...current, values], { shouldValidate: true });
        } else {
            const current = form.getValues("characters") ?? [];
            const idx = characterDialogObject.editIndex!;
            const next = current.map((c, i) => (i === idx ? values : c));
            form.setValue("characters", next, { shouldValidate: true });
        }
        setCharacterDialogObject({ visible: false, type: "add", editIndex: undefined, defaultValues: null, context: {} });
    }

    const [showCreateWorld, setShowCreateWorld] = useState(false);

    const onCloseWorld = () => {
        setShowCreateWorld(false);
    };

    const onSubmitWorld = (data: WorldMetadata) => {
        form.setValue("world", data.content, { shouldValidate: true });
        setShowCreateWorld(false);
        // form.setValue("metadata", data.metadata);
    }

    const onAddCharacter = () => {
        setCharacterDialogObject({
            visible: true,
            type: "add",
            defaultValues: null,
            context: {
                category: form.getValues("category"),
                theme: form.getValues("theme"),
                world: form.getValues("world"),
            }
        });
    }

    return (
        <>
            <div className="w-full h-full py-8 px-4 overflow-y-auto relative">
                {/* h-0 + absolute 按钮在文档流中不占高，后续表单会叠在上面抢点击，需提高 z-index */}
                <div className="w-full h-0 sticky top-0 left-0 z-20 pointer-events-none">
                    <div className="w-4/5 lg:w-3/4 pr-[130px] mx-auto relative pointer-events-auto">
                        <Button
                            className="absolute top-2 right-0 h-12 px-8 bg-[#0F172A] shadow-[0_20px_25px_-5px_#E2E8F0,0_8px_10px_-6px_#E2E8F0] rounded-xl"
                            size="lg"
                            type="submit"
                            form="form-create-novel"
                            disabled={form.formState.isSubmitting}
                        >
                            {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
                            创建作品
                        </Button>
                    </div>
                </div>
                <div className="w-4/5 lg:w-3/4 relative pr-[130px] mx-auto flex flex-row gap-2 overflow-hidden relative">
                    <form className="w-full" id="form-create-novel" onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup>
                            {submitError ? (
                                <div
                                    className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                                    role="alert"
                                >
                                    {submitError}
                                </div>
                            ) : null}
                            <div className="p-8 bg-white shadow-xs rounded-xl flex flex-col gap-6">
                                <div className="text-xl font-bold flex items-center">
                                    <PencilRuler className="text-[#EF4444] mr-2" />
                                    基础设定
                                </div>
                                <Controller
                                    name="category"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                <RequiredAsterisk />
                                                类型
                                            </FieldLabel>
                                            <Select
                                                name={field.name}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger
                                                    aria-invalid={fieldState.invalid}
                                                >
                                                    <SelectValue placeholder="请选择小说类型" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categoryOptions.map(item => (
                                                        <SelectItem value={item} key={item}>{item}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="theme"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                <RequiredAsterisk />
                                                主题
                                            </FieldLabel>
                                            <FieldContent>
                                                <Input
                                                    {...field}
                                                    id={field.name}
                                                    aria-invalid={fieldState.invalid}
                                                    placeholder="作品所探讨的核心问题或主要思想或价值观"
                                                    autoComplete="off"
                                                />
                                            </FieldContent>
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="world"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor={field.name} className="flex justify-between">
                                                <span className="inline-flex items-center gap-1">
                                                    <RequiredAsterisk />
                                                    故事背景设定
                                                </span>
                                                <Button type="button" className="ml-auto cursor-pointer" size="sm" onClick={() => setShowCreateWorld(true)}>
                                                    <Brain />AI生成
                                                </Button>
                                            </FieldLabel>
                                            <FieldContent>
                                                <Textarea
                                                    {...field}
                                                    id="form-rhf-textarea-about"
                                                    aria-invalid={fieldState.invalid}
                                                    placeholder="故事背景设定通常是指故事发生的背景和环境。这包括了世界的地理位置、历史背景、文化体系、政治体系、科技发展程度等。"
                                                    autoComplete="off"
                                                    className="min-h-[120px] max-h-[240px]"
                                                />
                                            </FieldContent>
                                        </Field>
                                    )}
                                />
                            </div>

                            <div className="p-8 bg-white shadow-xs rounded-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="text-xl font-bold flex items-center">
                                        <Users className="text-[#EF4444] mr-2" />
                                        角色列表
                                    </div>
                                    <Button className="ml-auto" type="button" variant="outline" size="sm" onClick={onAddCharacter}>
                                        + 添加角色
                                    </Button>
                                </div>
                                <Controller
                                    name="characters"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            {(field.value?.length ?? 0) === 0 ? (
                                                <Empty className="border border-1 border-dashed rounded-xl">
                                                    <EmptyHeader>
                                                        <EmptyMedia variant="icon">
                                                            <UserPlus />
                                                        </EmptyMedia>
                                                        <EmptyTitle>
                                                            尚未创建核心角色
                                                        </EmptyTitle>
                                                        <EmptyDescription>
                                                            请点击右上角添加角色，由AI辅助您创建
                                                        </EmptyDescription>
                                                    </EmptyHeader>
                                                </Empty>
                                            ) : (
                                                <ItemGroup>
                                                    {field.value.map((character, index) => (
                                                        <Item key={`${character.name}-${index}`} variant="outline" className="bg-gray-primary">
                                                            <ItemMedia variant="default">
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon-lg"
                                                                    className={
                                                                        character.gender === "男"
                                                                            ? "bg-gradient-to-r from-sky-400 to-blue-500 border-transparent text-white hover:text-white hover:bg-sky-500"
                                                                            : character.gender === "女"
                                                                                ? "bg-gradient-to-br from-pink-400 to-rose-500 border-transparent text-white hover:text-white hover:bg-pink-500"
                                                                                : "bg-gradient-to-r from-orange-400 to-amber-500 border-transparent text-white hover:text-white hover:bg-orange-500"
                                                                    }
                                                                >
                                                                    {
                                                                        character.gender === "男" ? <Venus /> : character.gender === "女" ? <Mars /> : <NonBinary />
                                                                    }
                                                                </Button>
                                                            </ItemMedia>
                                                            <ItemContent>
                                                                <ItemTitle>{character.name}</ItemTitle>
                                                                <ItemDescription>
                                                                    {[
                                                                        ["年龄", character.age],
                                                                        ["角色定位", character.roleArchetype],
                                                                        ["性格", character.personality],
                                                                        ["能力", character.abilities],
                                                                        ["关系", character.relationships],
                                                                        ["背景", character.background],
                                                                        ["语言风格", character.speechStyle],
                                                                    ]
                                                                        .filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "")
                                                                        .map(([k, v]) => `${k}:${String(v)}`)
                                                                        .join(" ｜ ")}
                                                                </ItemDescription>
                                                            </ItemContent>

                                                            <ItemActions>
                                                                <ButtonGroup>
                                                                    <Button size="sm" onClick={() => onEditCharacter(character, index)}>
                                                                        <PenLine />
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" onClick={() => onDeleteCharacter(index)}>
                                                                        <Trash />
                                                                    </Button>
                                                                </ButtonGroup>
                                                            </ItemActions>
                                                        </Item>
                                                    ))}
                                                </ItemGroup>
                                            )}
                                        </Field>
                                    )}
                                />
                            </div>
                        </FieldGroup>
                    </form>
                </div>
            </div>
            {showCreateWorld && (
                <CreateWorld
                    category={form.getValues("category")}
                    theme={form.getValues("theme")}
                    onClose={onCloseWorld}
                    onSubmit={onSubmitWorld}
                />
            )}
            {
                characterDialogObject.visible && (
                    <CreateCharacters
                        visible={characterDialogObject.visible}
                        defaultValues={characterDialogObject.defaultValues}
                        context={characterDialogObject.context}
                        type={characterDialogObject.type}
                        onSubmit={onSubmitCharacter}
                        onCancel={onCancelCharacter}
                    />
                )
            }
        </>
    )
}