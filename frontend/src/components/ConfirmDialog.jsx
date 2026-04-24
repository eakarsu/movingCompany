import { useState, useCallback, createContext, useContext } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'danger',
    onConfirm: null,
  });

  const confirm = useCallback(({ title, message, confirmLabel, cancelLabel, variant }) => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: title || 'Are you sure?',
        message: message || 'This action cannot be undone.',
        confirmLabel: confirmLabel || 'Confirm',
        cancelLabel: cancelLabel || 'Cancel',
        variant: variant || 'danger',
        onConfirm: resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    state.onConfirm?.(true);
    setState((s) => ({ ...s, isOpen: false }));
  };

  const handleCancel = () => {
    state.onConfirm?.(false);
    setState((s) => ({ ...s, isOpen: false }));
  };

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    info: 'bg-blue-600 hover:bg-blue-700',
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{state.title}</h3>
            <p className="text-gray-600 mb-6">{state.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {state.cancelLabel}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${variantStyles[state.variant]}`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
