import { useState, useCallback, useRef } from 'react';

const MILESTONE_THRESHOLDS = [60, 300, 600, 1800, 3600, 5400, 7200];

export function useMilestones() {
  const shownMilestones = useRef<Set<number>>(new Set());
  const [currentMilestone, setCurrentMilestone] = useState<number | null>(null);

  const checkMilestone = useCallback((elapsedSeconds: number) => {
    if (currentMilestone !== null) return;
    
    for (let i = MILESTONE_THRESHOLDS.length - 1; i >= 0; i--) {
      const threshold = MILESTONE_THRESHOLDS[i];
      if (elapsedSeconds >= threshold && !shownMilestones.current.has(threshold)) {
        shownMilestones.current.add(threshold);
        setCurrentMilestone(threshold);
        break;
      }
    }
  }, [currentMilestone]);

  const dismissMilestone = useCallback(() => setCurrentMilestone(null), []);
  
  const resetMilestones = useCallback(() => {
    shownMilestones.current.clear();
    setCurrentMilestone(null);
  }, []);

  return { checkMilestone, currentMilestone, dismissMilestone, resetMilestones };
}

export default useMilestones;

