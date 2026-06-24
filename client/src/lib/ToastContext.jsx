import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeouts = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timeouts.current[id]);
    delete timeouts.current[id];
  }, []);

  const showToast = useCallback((message, type = 'error', { onUndo } = {}) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type, onUndo }]);
    timeouts.current[id] = setTimeout(() => dismiss(id), onUndo ? 6000 : 5000);
    return id;
  }, [dismiss]);

  function handleUndo(toast) {
    dismiss(toast.id);
    if (toast.onUndo) toast.onUndo();
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className={`toast toast-${t.type}`} key={t.id}>
            <span>{t.message}</span>
            <div className="toast-actions">
              {t.onUndo && (
                <button className="toast-undo" onClick={() => handleUndo(t)}>Undo</button>
              )}
              <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
