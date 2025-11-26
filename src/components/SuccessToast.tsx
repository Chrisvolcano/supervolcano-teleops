'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';
import { useEffect } from 'react';

interface SuccessToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
}

export default function SuccessToast({ message, show, onClose }: SuccessToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed right-4 top-4 z-50 flex items-center gap-3 rounded-xl bg-green-500 px-4 py-3 shadow-lg"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="text-white" size={24} />
          </motion.div>
          <span className="font-medium text-white">{message}</span>
          <button
            onClick={onClose}
            className="ml-2 rounded-lg p-1 transition-colors hover:bg-green-600"
          >
            <X className="text-white" size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



