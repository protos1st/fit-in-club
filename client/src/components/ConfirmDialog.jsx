import { useState, useEffect } from 'react';

let _show = null;

export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    _show?.({ title, message, confirmLabel, danger, resolve });
  });
}

export default function ConfirmDialog() {
  const [state, setState] = useState(null);

  useEffect(() => {
    _show = (s) => setState(s);
    return () => { _show = null; };
  }, []);

  if (!state) return null;

  function close(result) {
    state.resolve(result);
    setState(null);
  }

  return (
    <div className="modal-overlay" onClick={() => close(false)}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h3 className="confirm-title">{state.title}</h3>
        <p className="confirm-message">{state.message}</p>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={() => close(false)}>Cancel</button>
          <button
            className={`btn ${state.danger ? 'btn-danger-outline' : 'btn-primary'}`}
            onClick={() => close(true)}
            autoFocus
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
