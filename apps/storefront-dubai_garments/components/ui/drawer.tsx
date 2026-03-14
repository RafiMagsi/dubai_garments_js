'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  side?: 'left' | 'right';
  children: ReactNode;
  className?: string;
};

export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  children,
  className,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const currentLocks = Number(body.dataset.uiOverlayLocks || '0');
    const nextLocks = currentLocks + 1;
    body.dataset.uiOverlayLocks = String(nextLocks);

    if (nextLocks === 1) {
      body.dataset.uiOverlayPrevOverflow = body.style.overflow || '';
      body.style.overflow = 'hidden';
      body.classList.add('ui-overlay-lock');
    }

    return () => {
      const remainingLocks = Math.max(0, Number(body.dataset.uiOverlayLocks || '1') - 1);
      body.dataset.uiOverlayLocks = String(remainingLocks);

      if (remainingLocks === 0) {
        body.style.overflow = body.dataset.uiOverlayPrevOverflow || '';
        delete body.dataset.uiOverlayPrevOverflow;
        body.classList.remove('ui-overlay-lock');
      }
    };
  }, [open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="ui-overlay ui-overlay-drawer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className={clsx('ui-drawer', `ui-drawer-${side}`, className)} aria-label={title || 'Drawer'}>
        {title ? (
          <div className="ui-drawer-head">
            <h3 className="ui-drawer-title">{title}</h3>
            <button type="button" className="dg-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : null}
        <div className="ui-drawer-body">{children}</div>
      </aside>
    </div>,
    document.body
  );
}
