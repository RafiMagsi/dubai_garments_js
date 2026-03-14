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
      <div className="ui-modal-card ui-modal-size-xl">
        <div className="ui-modal-head">
          <div className="ui-modal-title-block">
            <p className="ui-modal-kicker">Execution Output</p>
            <h3 className="ui-modal-title">{state.command}</h3>
            <p className="ui-modal-meta">Executed: {formatDate(state.executedAt)}</p>
          </div>
          <div className="ui-modal-actions">
            <span className={statusBadgeClass(state.status)}>{titleCase(state.status || 'unknown')}</span>
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-md" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="ui-modal-grid-split">
          <div>
            <p className="ui-command-label">Input</p>
            <pre className="ui-command-surface ui-command-surface-light">
              {state.input}
            </pre>
          </div>
          <div>
            <p className="ui-command-label">Output</p>
            <pre className="ui-command-surface ui-command-surface-dark">
              {state.output}
            </pre>
          </div>
        </div>
      </div>
    </Modal>
  );
}
