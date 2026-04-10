import { Clock, FileText } from "lucide-react";
import { useContext } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WritingContext } from "@/contexts/writing-context";
import { withCompositionHandler } from "@/hoc/withCompositionHandler";
import { formatRelativeTime, thousandSeparator } from "@/lib/utils";


interface EditorProps {
  className?: string;
}

const SmartTextArea = withCompositionHandler(Textarea);
const SmartInput = withCompositionHandler(Input);

export default function Editor({ className }: EditorProps) {
  const { selectedItem, onChangeChapterContent, onChangeChapterName } = useContext(WritingContext);

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden h-fit px-12 pb-12 bg-white">
      <div className="sticky top-0 bg-white py-8">
        <SmartInput
          className="w-full h-12 !text-3xl p-0 bg-transparent border-0 shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          value={selectedItem?.name}
          placeholder="章节名"
          onChange={(e) => onChangeChapterName?.(e.target.value)}
        />
        <div className="flex gap-6 mt-4 text-slate-400">
          <span className="flex items-center text-xs">
            <FileText size={12} className="mr-1" />
            {thousandSeparator(selectedItem?.wordCount || 0)} 字
          </span>
          <span className="flex items-center text-xs">
            <Clock size={12} className="mr-1" />
            最近更新：{formatRelativeTime(selectedItem?.updatedAt as unknown as string)}
          </span>
        </div>
      </div>
      <SmartTextArea
        className="!text-base text-gray-900/90 flex-1 w-full overflow-y-auto no-scrollbar px-0 !bg-white border-0 shadow-[0_20px_40px_rgba(25,28,29,0.03)] resize-none shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="在这里撰写正文，或使用右侧 AI 助手生成内容…"
        value={selectedItem?.content}
        onChange={(e) => onChangeChapterContent?.(e.target.value)}
      />
    </div>
  );
}

