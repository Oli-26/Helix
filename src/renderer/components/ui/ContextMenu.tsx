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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const actionItems = items.filter((i) => !i.separator);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const menuHeight = items.length * 34 + 8;
      const menuWidth = 220;
      const x = Math.min(e.clientX, window.innerWidth - menuWidth);
      const y = Math.min(e.clientY, window.innerHeight - menuHeight);

      setPosition({ x, y });
      setFocusedIndex(-1);
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          let next = prev + 1;
          while (next < actionItems.length && actionItems[next]?.disabled) next++;
          return next < actionItems.length ? next : prev;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && actionItems[next]?.disabled) next--;
          return next >= 0 ? next : prev;
        });
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        const item = actionItems[focusedIndex];
        if (item && !item.disabled) {
          item.onClick?.();
          setOpen(false);
        }
      }
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, focusedIndex, actionItems]);

  let actionIndex = -1;

  return (
    <>
      <div ref={containerRef} onContextMenu={handleContextMenu}>
        {children}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
            className="fixed z-[200] min-w-[200px] bg-popover border border-default rounded-lg py-1 overflow-hidden"
            style={{
              left: position.x,
              top: position.y,
              boxShadow: 'var(--shadow-lg), 0 0 0 1px var(--color-border)',
            }}
          >
            {items.map((item, index) => {
              if (item.separator) {
                return (
                  <div
                    key={`sep-${index}`}
                    className="h-px bg-[var(--color-border)] my-1 mx-2"
                  />
                );
              }

              actionIndex++;
              const isFocused = focusedIndex === actionIndex;
              const currentActionIndex = actionIndex;

              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick?.();
                      setOpen(false);
                    }
                  }}
                  onMouseEnter={() => setFocusedIndex(currentActionIndex)}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center gap-3 px-3 py-1.5 text-[13px] transition-colors text-left
                    ${item.disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
                    ${isFocused && !item.disabled
                      ? item.danger ? 'bg-danger-muted text-danger' : 'bg-hover text-primary'
                      : item.danger ? 'text-danger' : 'text-primary'
                    }
                  `}
                >
                  {item.icon && (
                    <span className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${
                      isFocused ? (item.danger ? 'text-danger' : 'text-primary') : 'text-secondary'
                    }`}>
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-tertiary text-tertiary ml-4 font-mono">
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
