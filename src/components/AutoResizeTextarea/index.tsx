import type React from "react";
import { useRef, useEffect } from "react";

interface AutoResizeTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  maxHeight?: number; // 可选：最大高度限制
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  onChange,
  placeholder = "Please enter the content...",
  className = "",
  minRows = 1,
  maxHeight,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto"; // 重置高度
    el.style.height = el.scrollHeight + "px"; // 设置为内容高度

    if (maxHeight && el.scrollHeight > maxHeight) {
      el.style.height = maxHeight + "px";
      el.style.overflowY = "auto";
    } else {
      el.style.overflowY = "hidden";
    }
  };

  useEffect(() => {
    resize(); // 初始/更新时执行
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={minRows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full resize-none !overflow-hidden border-none text-center text-white !text-[16px] !leading-[24px] transition focus:outline-none ${className}`}
    />
  );
};

export default AutoResizeTextarea;
