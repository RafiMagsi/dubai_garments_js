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
      <div className="ui-modal-card ui-modal-size-lg">
        <div className="ui-modal-head">
          <div className="ui-modal-title-block">
            <p className="ui-modal-kicker">Execution Log</p>
            <h3 className="ui-modal-title">{state.scriptName}</h3>
            <p className="ui-modal-meta">Command/Workflow: {state.command}</p>
          </div>
          <div className="ui-modal-actions">
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
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-md" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <pre className="ui-command-surface ui-command-surface-dark">
          {state.output || 'No output yet.'}
        </pre>
      </div>
    </Modal>
  );
}
