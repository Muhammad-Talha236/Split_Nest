import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 480, className = '' }) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="app-modal__backdrop"
      onClick={onClose}
    >
      <div
        className={`app-modal ${className}`.trim()}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth,
        }}
      >
        <div className="app-modal__header">
          <h3 className="app-modal__title">{title}</h3>
          <button
            className="app-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <span className="app-modal__close-icon">×</span>
          </button>
        </div>
        <div className="app-modal__body">{children}</div>
      </div>
    </div>
  );
};

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', loading }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={400}>
    <p className="app-modal__message">{message}</p>
    <div className="app-modal__actions">
      <button
        className="app-modal__action app-modal__action--secondary"
        type="button"
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        className="app-modal__action app-modal__action--danger"
        type="button"
        onClick={onConfirm}
        disabled={loading}
      >
        {loading ? 'Deleting...' : confirmText}
      </button>
    </div>
  </Modal>
);

export default Modal;
