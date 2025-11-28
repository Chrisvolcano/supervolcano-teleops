'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  delay?: number;
}

export default function AnimatedCard({ 
  children, 
  onClick,
  className = '',
  delay = 0
}: AnimatedCardProps) {
  const isClickable = !!onClick;
  
  return (
    <motion.div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 ${isClickable ? 'cursor-pointer' : ''} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileTap={isClickable ? { scale: 0.98 } : {}}
      whileHover={isClickable ? { scale: 1.02, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } : {}}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}



