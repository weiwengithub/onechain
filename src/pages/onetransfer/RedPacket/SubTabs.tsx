import { createFileRoute } from '@tanstack/react-router';

type SubTabDescriptor<T extends number> = {
  key: T;
  label: string;
};

type SubTabsProps<T extends number> = {
  activeTab: T;
  tabs: SubTabDescriptor<T>[];
  onChange: (tab: T) => void;
};

export const Route = createFileRoute('/onetransfer/RedPacket/SubTabs')({
  component: SubTabsRoute,
});

function SubTabsRoute() {
  return null;
}

export default function SubTabs<T extends number>({ activeTab, tabs, onChange }: SubTabsProps<T>) {
  return (
    <div className="flex mb-8 space-x-6">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            style={{ fontSize: '16px' }}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              isActive ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
