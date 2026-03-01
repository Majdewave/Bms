import React from "react";

interface ActivityItem {
  id: string;
  type: string;
  content: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  items: ActivityItem[];
}

export const ActivityTimeline = ({ items }: ActivityTimelineProps) => {
  return (
    <div className="space-y-6">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-4">
          <div className="w-2 h-2 mt-2 bg-blue-600 rounded-full" />
          <div>
            <div className="text-sm text-slate-800 font-medium">{item.content}</div>
            <div className="text-xs text-slate-400 mt-1">{new Date(item.timestamp).toLocaleString("he-IL")}</div>
          </div>
        </div>
      ))}
    </div>
  );
};