'use client';

import Modal from '@/components/ui/modal';
import {
  formatDate,
  statusBadgeClass,
  titleCase,
} from '@/features/admin/configuration/utils/view-format';

export type ExecutionOutputModalState = {
  open: boolean;
  command: string;
  status: string;
  output: string;
  input: string;
  executedAt: string;
};

type ExecutionOutputModalProps = {
  state: ExecutionOutputModalState;
  onClose: () => void;
};

export default function ExecutionOutputModal({ state, onClose }: ExecutionOutputModalProps) {
  return (
    <Modal open={state.open} onClose={onClose}>
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-600">Execution Output</p>
            <h3 className="text-lg font-bold text-slate-900">{state.command}</h3>
            <p className="mt-1 text-xs text-slate-500">Executed: {formatDate(state.executedAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={statusBadgeClass(state.status)}>{titleCase(state.status || 'unknown')}</span>
            <button type="button" className="dg-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Input</p>
            <pre className="max-h-[50vh] overflow-auto rounded-xl bg-slate-100 p-3 text-xs text-slate-700">
              {state.input}
            </pre>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Output</p>
            <pre className="max-h-[50vh] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
              {state.output}
            </pre>
          </div>
        </div>
      </div>
    </Modal>
  );
}
