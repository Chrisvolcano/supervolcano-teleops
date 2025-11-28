'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedIconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'ghost' | 'primary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export default function AnimatedIconButton({ 
  children, 
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props 
}: AnimatedIconButtonProps) {
  
  const variantClasses = {
    ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
    primary: 'text-blue-600 hover:bg-blue-50 active:bg-blue-100',
    danger: 'text-red-600 hover:bg-red-50 active:bg-red-100'
  };
  
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  return (
    <motion.button
      className={`rounded-lg transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

