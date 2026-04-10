"use client";

import { ChatStatus } from "ai";
import { ArrowUp, LoaderCircle, Square } from 'lucide-react';
import { KeyboardEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";


interface ChatInputProps {
  onSend: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  status?: ChatStatus;
  onAbort?: () => void;
  actions?: React.ReactNode | React.ReactNode[];
}

export default function ChatInput({
  onSend,
  disabled,
  placeholder = "输入你的问题，Shift+Enter 换行，Enter 发送…",
  status = 'ready',
  onAbort = () => { },
  actions = []
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);


  const ref = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollHeight = el.scrollHeight;
    const maxHeight = parseInt(getComputedStyle(el.parentNode as Element).maxHeight);
    const minHeight = parseInt(getComputedStyle(el.parentNode as Element).minHeight);
    if (scrollHeight > maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = 'auto';
    } else {
      el.style.height = `${Math.max(scrollHeight, minHeight)}px`;
      el.style.overflowY = 'hidden';
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      adjustHeight();
    })
  }, [value])

  const handleSend = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();

    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (status === 'submitted') return;
    if (status === 'streaming') return;

    const native = e.nativeEvent as unknown as { isComposing?: boolean; keyCode?: number };
    const composing = isComposing || native.isComposing || native.keyCode === 229;
    if (composing) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onClickBtn = () => {
    if (status === 'submitted') return;
    if (status === 'streaming') {
      onAbort?.();
      return;
    }
    handleSend();
  };

  return (
    <div className="rounded-4xl border-1 border-solid border-slate-300 p-2.5 bg-white shadow-sm shadow-slate-100 @container/chat">
      <div className="px-2.5 min-h-14 max-h-[max(30svh,5rem)] overflow-hidden">
        <textarea
          ref={ref}
          name="prompt-textarea"
          className="w-full overflow-x-hidden overflow-y-auto bg-white text-gray-800 placeholder:text-gray-400 leading-relaxed antialiased outline-none ring-0 transition resize-none border-none outline-none shadow-none cursor-text"
          rows={2}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="tool-bar flex cursor-text" onClick={() => ref.current?.focus()}>
        {actions}
        <Button
          size="icon"
          onClick={onClickBtn}
          disabled={(!value.trim() && status === 'ready') || status === 'submitted'}
          className="ml-auto rounded-full cursor-pointer bg-red-500"
        >
          {
            status === 'submitted'
              ? <LoaderCircle className="animate-spin" />
              : status === 'streaming'
                ? <Square fill="currentColor" />
                : <ArrowUp strokeWidth={3} />
          }

        </Button>
      </div>
    </div >
  );
}

