import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
}

export function ContextMenu({ items, children }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Position the menu, keeping it within viewport
      const x = Math.min(e.clientX, window.innerWidth - 220);
      const y = Math.min(e.clientY, window.innerHeight - items.length * 36 - 16);

      setPosition({ x, y });
      setOpen(true);
    },
    [items.length],
  );

  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <>
      <div ref={containerRef} onContextMenu={handleContextMenu}>
        {children}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[200] min-w-[200px] bg-secondary border border-default rounded-lg shadow-lg py-1 overflow-hidden"
            style={{ left: position.x, top: position.y }}
          >
            {items.map((item, index) => {
              if (item.separator) {
                return (
                  <div
                    key={`sep-${index}`}
                    className="h-px bg-[var(--color-border)] my-1"
                  />
                );
              }

              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick?.();
                      setOpen(false);
                    }
                  }}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center gap-3 px-3 py-1.5 text-sm transition-colors text-left
                    ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                    ${item.danger ? 'text-danger hover:bg-danger-muted' : 'text-primary hover:bg-hover'}
                  `}
                >
                  {item.icon && (
                    <span className="w-4 h-4 flex items-center justify-center text-secondary flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-tertiary text-tertiary ml-4">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
