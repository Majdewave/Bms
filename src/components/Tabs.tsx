import React, { ReactNode } from "react";

interface Tab {
  label: string;
  key: string;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  children: ReactNode;
}

export const Tabs = ({ tabs, activeKey, onChange, children }: TabsProps) => {
  return (
    <div>
      <div className="flex border-b mb-4 sticky top-0 bg-white z-10">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors duration-200 ${
              activeKey === tab.key
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-transparent text-slate-600 hover:text-blue-600"
            }`}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
};