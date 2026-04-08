import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({
  value,
  className = '',
  duration = 0.5,
}: AnimatedCounterProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => {
      setDisplayValue(v);
    });
    return unsubscribe;
  }, [display]);

  return <span className={`tabular-nums ${className}`}>{displayValue}</span>;
}

interface AnimatedBadgeCounterProps {
  value: number;
  color?: 'accent' | 'success' | 'danger' | 'warning';
  className?: string;
}

export function AnimatedBadgeCounter({
  value,
  color = 'accent',
  className = '',
}: AnimatedBadgeCounterProps) {
  const prevValue = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (value !== prevValue.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 300);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  if (value === 0) return null;

  const colorClasses = {
    accent: 'bg-accent text-text-inverse',
    success: 'bg-success text-text-inverse',
    danger: 'bg-danger text-text-inverse',
    warning: 'bg-warning text-text-inverse',
  };

  return (
    <motion.span
      animate={flash ? { scale: [1, 1.3, 1] } : {}}
      transition={{ duration: 0.3 }}
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${colorClasses[color]} ${className}`}
    >
      <AnimatedCounter value={value} />
    </motion.span>
  );
}
