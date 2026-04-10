'use client';

import React, { ComponentType, forwardRef, useCallback, useEffect, useState } from 'react';

type CompositionElement = HTMLInputElement | HTMLTextAreaElement;
type ChangeHandler = React.ChangeEventHandler<CompositionElement>;
type CompositionHandler = React.CompositionEventHandler<CompositionElement>;

type WithCompositionHandlerProps = {
  value?: string | number | readonly string[];
  onChange?: ChangeHandler;
  onCompositionStart?: CompositionHandler;
  onCompositionEnd?: CompositionHandler;
};

export function withCompositionHandler<P extends object>(
  WrappedComponent: ComponentType<P & WithCompositionHandlerProps>
) {
  const ComponentWithComposition = forwardRef<CompositionElement, P & WithCompositionHandlerProps>((props, ref) => {
    const { value = '', onChange, onCompositionStart, onCompositionEnd, ...rest } = props;
    const [innerValue, setInnerValue] = useState(String(value ?? ''));
    const [isComposing, setIsComposing] = useState(false);

    // 当外部 value 变化时同步内部状态（保证受控）
    useEffect(() => {
      setInnerValue(String(value ?? ''));
    }, [value]);

    const handleChange = useCallback((e: React.ChangeEvent<CompositionElement>) => {
      setInnerValue(e.target.value);
      if (!isComposing) {
        onChange?.(e);
      }
    }, [isComposing, onChange]);

    const handleCompositionStart = useCallback((e: React.CompositionEvent<CompositionElement>) => {
      setIsComposing(true);
      onCompositionStart?.(e);
    }, [onCompositionStart]);

    const handleCompositionEnd = useCallback((e: React.CompositionEvent<CompositionElement>) => {
      setIsComposing(false);
      const finalValue = e.currentTarget.value;
      setInnerValue(finalValue);
      onCompositionEnd?.(e);

      // 输入法结束后，手动触发一次 change，确保外部拿到最终值
      const syntheticChangeEvent = {
        ...e,
        target: { ...e.target, value: finalValue },
        currentTarget: { ...e.currentTarget, value: finalValue },
      } as unknown as React.ChangeEvent<CompositionElement>;
      onChange?.(syntheticChangeEvent);
    }, [onChange, onCompositionEnd]);

    const composedProps = {
      ...rest,
      ref,
      value: innerValue,
      onChange: handleChange,
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
    } as unknown as P & WithCompositionHandlerProps;

    return <WrappedComponent {...composedProps} />;
  });

  // 设置显示名称便于调试
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  ComponentWithComposition.displayName = `withCompositionHandler(${displayName})`;

  return ComponentWithComposition;
}