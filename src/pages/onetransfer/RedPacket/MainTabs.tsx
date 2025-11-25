import { createFileRoute } from '@tanstack/react-router';

type MainTabDescriptor<T extends number> = {
  key: T;
  label: string;
};

type MainTabsProps<T extends number> = {
  title: string;
  activeTab: T;
  tabs: MainTabDescriptor<T>[];
  onChange: (tab: T) => void;
};

export const Route = createFileRoute('/onetransfer/RedPacket/MainTabs')({
  component: MainTabsRoute,
});

function MainTabsRoute() {
  return null;
}

export default function MainTabs<T extends number>(
  {
    title,
    activeTab,
    tabs,
    onChange,
  }: MainTabsProps<T>) {
  return (
    <div className="mb-8">
      <div className="flex border-b border-[#2F323A]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className="relative flex-1 pb-5 text-center"
            >
              <span
                className={`text-[16px] font-semibold transition-colors ${
                  isActive ? 'text-white' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </span>
              <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[#2F323A]" />
              <div
                className={`absolute bottom-0 left-0 h-[2px] w-full transition-opacity ${
                  isActive ? 'bg-[#3B82FF] opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
