import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export type DropdownSelectorOption<T extends string> = {
  key: T;
  label: string;
};

type DropdownSelectorProps<T extends string> = {
  options: DropdownSelectorOption<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
  containerClassName?: string;
  buttonClassName?: string;
  menuClassName?: string;
  itemClassName?: string;
  caret?: React.ReactNode;
};

export default function DropdownSelector<T extends string>({
                                                             options,
                                                             selectedKey,
                                                             onSelect,
                                                             containerClassName,
                                                             buttonClassName,
                                                             menuClassName,
                                                             itemClassName,
                                                             caret,
                                                           }: DropdownSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((option) => option.key === selectedKey) ?? options[0];

  return (
    <div className={clsx('relative inline-block text-sm', containerClassName)} ref={menuRef}>
      <button
        className={clsx(
          'flex items-center gap-1 rounded-full border border-[#2C3039] bg-[#1E2025] px-4 py-1.5 text-[14px] text-white',
          buttonClassName,
        )}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {selectedOption?.label}
        <span className={clsx('transition-transform', isOpen ? 'rotate-180' : '')}>{caret ?? '▾'}</span>
      </button>
      {isOpen && (
        <div
          className={clsx(
            'absolute left-0 mt-2 min-w-[160px] rounded-[12px] border border-[#2C3039] bg-[#1E2025] shadow-lg z-10 overflow-hidden',
            menuClassName,
          )}
        >
          {options.map((option) => (
            <div
              key={option.key}
              className={clsx(
                'px-4 py-2 text-[14px] text-white cursor-pointer hover:bg-[#2C3039]',
                option.key === selectedKey ? 'text-[#477CFC]' : '',
                itemClassName,
              )}
              onClick={() => {
                onSelect(option.key);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
