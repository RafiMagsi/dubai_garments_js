'use client';

import Modal from '@/components/ui/modal';
import { titleCase } from '@/features/admin/configuration/utils/view-format';

export type CommandRunLogModalState = {
  open: boolean;
  scriptName: string;
  command: string;
  status: 'running' | 'success' | 'failed';
  output: string;
};

type CommandRunLogModalProps = {
  state: CommandRunLogModalState;
  onClose: () => void;
};

export default function CommandRunLogModal({ state, onClose }: CommandRunLogModalProps) {
  return (
    <Modal open={state.open} onClose={onClose}>
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-600">Execution Log</p>
            <h3 className="text-lg font-bold text-slate-900">{state.scriptName}</h3>
            <p className="mt-1 text-xs text-slate-500">Command/Workflow: {state.command}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={
                state.status === 'success'
                  ? 'dg-status-pill'
                  : state.status === 'failed'
                    ? 'dg-status-pill dg-status-pill-LOST'
                    : 'dg-status-pill dg-status-pill-NEW'
              }
            >
              {titleCase(state.status)}
            </span>
            <button type="button" className="dg-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <pre className="max-h-[65vh] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
          {state.output || 'No output yet.'}
        </pre>
      </div>
    </Modal>
  );
}
