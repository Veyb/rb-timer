// global modules
import { createPortal } from 'react-dom';
import {
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

// style modules
import styles from './modal.module.css';

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  show: boolean;
  onClose: () => void;
}

const Modal = ({ show, children, onClose }: ModalProps) => {
  const modalRoot = useRef<HTMLElement | null>(null);
  const container = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!container.current) {
      container.current = document.createElement('div');
    }
    modalRoot.current = document.getElementById('modal-root');
    if (modalRoot.current) {
      modalRoot.current.appendChild(container.current);
    }

    closeRef.current = document.activeElement;
    setMounted(true);

    return () => {
      if (closeRef.current) {
        (closeRef.current as HTMLElement).focus();
      }
      if (modalRoot.current && container.current) {
        modalRoot.current.removeChild(container.current);
      }
      setMounted(false);
    };
  }, []);

  const onKeyDownHandler = useCallback(
    (e: KeyboardEvent) => {
      const escape = e.key === 'Escape';

      if (escape && onClose) {
        onClose();
      }
    },
    [onClose]
  );

  const handleCloseClick = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onClose();
  };

  const modalContent = show ? (
    <div className={styles.wrapper} onKeyDown={onKeyDownHandler}>
      {children}
    </div>
  ) : null;

  return !mounted || !container.current || !modalRoot.current
    ? null
    : createPortal(modalContent, container.current);
};

export default Modal;
