import React from 'react';
import { Activity } from 'lucide-react';
import { DeskShell } from '@/components/DeskShell';
import { TaskFeedPanel } from '@/components/TaskFeedPanel';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function TasksPage() {
  const { desk, activeClientId, refreshDesk, openWindow, showToast } = useApp();
  const tasks = desk?.tasks.filter((t) => !activeClientId || t.clientId === activeClientId) ?? [];

  return (
    <DeskShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
              <Activity className="h-6 w-6 text-cyan-400" />
              Task Feed &amp; Phase-Gate Controls
            </h1>
            <p className="text-xs text-slate-400">
              Expected soft skips (dashed slate), dependency blocks (violet gate), and real failures (rose) are visually and semantically distinct.
            </p>
          </div>
        </div>

        <div className="min-h-[560px]">
          <TaskFeedPanel
            tasks={tasks}
            onTaskAction={async (taskId, action) => {
              await api.taskAction(taskId, action);
              await refreshDesk();
              showToast(`Task ${action.toLowerCase()} completed.`);
            }}
            onOpenSpecialist={(deskKey) =>
              openWindow({
                title: `Specialist Desk — ${deskKey}`,
                kind: 'SPECIALIST',
                entityId: deskKey,
              })
            }
          />
        </div>
      </div>
    </DeskShell>
  );
}
