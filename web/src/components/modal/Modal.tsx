import React, { ReactNode } from 'react';
import './Modal.css';

interface ModalProps {
  children: ReactNode;
  onClose?: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  return (
    <div className="overlay">
      <div className="modal">
        {onClose && (
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;
