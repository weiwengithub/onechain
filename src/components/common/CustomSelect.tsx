import { useEffect, useRef, useState } from 'react';

type SelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  value: string;
  options: string[] | SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export default function CustomSelect({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理外部点击关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // 标准化选项格式
  const normalizedOptions: SelectOption[] = options.map((option) => {
    if (typeof option === 'string') {
      return { value: option, label: option };
    }
    return option;
  });

  // 获取当前显示的label
  const displayLabel = normalizedOptions.find((opt) => opt.value === value)?.label || value || placeholder;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 选择框按钮 */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        style={{ fontSize: '16px', backgroundColor: '#1E2025', height: '50px' }}
        className={`w-full rounded-xl px-4 text-white text-left flex items-center justify-between focus:outline-none transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-80'
        }`}
      >
        <span>{displayLabel}</span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉选项列表 */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 rounded-xl shadow-lg p-3 flex flex-col gap-1"
          style={{ backgroundColor: '#1E2025' }}
        >
          {normalizedOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors rounded-lg ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'text-white hover:bg-gray-700'
                }`}
                style={{ fontSize: '16px' }}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
