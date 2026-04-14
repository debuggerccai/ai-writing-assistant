"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type EditNovelSettingsDialogProps = {
  open: boolean;
  defaultTitle: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (title: string) => Promise<void>;
};

export function EditNovelSettingsDialog({
  open,
  defaultTitle,
  onOpenChange,
  onConfirm,
}: EditNovelSettingsDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setErrorMessage(null);
      setSubmitting(false);
    }
  }, [defaultTitle, open]);

  const normalizedTitle = useMemo(() => title.trim(), [title]);

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!normalizedTitle) {
      setErrorMessage("作品名称不能为空");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirm(normalizedTitle);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新作品设置失败";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改作品设置</DialogTitle>
        </DialogHeader>
        <Field data-invalid={!!errorMessage}>
          <FieldLabel htmlFor="edit-work-title">作品名称</FieldLabel>
          <FieldContent>
            <Input
              id="edit-work-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
              aria-invalid={!!errorMessage}
              placeholder="请输入作品名称"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleConfirm();
                }
              }}
            />
            {errorMessage ? <FieldError errors={[{ message: errorMessage }]} /> : null}
          </FieldContent>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={submitting}>
            取消
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={submitting}>
            {submitting ? "提交中..." : "确定"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
