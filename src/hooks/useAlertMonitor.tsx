import { useEffect, useRef } from "react";
import { getGuardsData, getShiftSettings } from "@/utils/storage";
import { toast } from "sonner";

interface Alert {
  guard: string;
  post: string;
  duration: number;
}

export const useAlertMonitor = () => {
  const shownAlertsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkAlerts = () => {
      const data = getGuardsData();
      const settings = getShiftSettings();
      const now = new Date();
      const currentAlerts: Alert[] = [];

      // Get the latest active task for each guard
      const guardLatestTasks = new Map<string, { type: string; post: string; actualTime: string; thresholdMinutes: number }>();

      // Collect all tasks with actualTime
      data.assignments.forEach(assignment => {
        if (!assignment.actualTime) return;
        const time = new Date(assignment.actualTime).getTime();
        const current = guardLatestTasks.get(assignment.guard);
        if (!current || new Date(current.actualTime).getTime() < time) {
          guardLatestTasks.set(assignment.guard, {
            type: 'post',
            post: `עמדה: ${assignment.post}`,
            actualTime: assignment.actualTime,
            thresholdMinutes: settings.alertThresholdMinutes
          });
        }
      });

      data.patrols?.forEach(patrol => {
        if (!patrol.actualTime) return;
        const time = new Date(patrol.actualTime).getTime();
        const current = guardLatestTasks.get(patrol.guard);
        if (!current || new Date(current.actualTime).getTime() < time) {
          guardLatestTasks.set(patrol.guard, {
            type: 'patrol',
            post: `פטרול: ${patrol.patrol}`,
            actualTime: patrol.actualTime,
            thresholdMinutes: settings.alertThresholdMinutes
          });
        }
      });
      
      data.breaks.forEach(breakAssignment => {
        if (!breakAssignment.actualTime) return;
        const time = new Date(breakAssignment.actualTime).getTime();
        const current = guardLatestTasks.get(breakAssignment.guard);
        if (!current || new Date(current.actualTime).getTime() < time) {
          guardLatestTasks.set(breakAssignment.guard, {
            type: 'break',
            post: "הפסקה",
            actualTime: breakAssignment.actualTime,
            thresholdMinutes: settings.breakThresholdMinutes
          });
        }
      });
      
      data.meals.forEach(meal => {
        if (!meal.actualTime) return;
        const time = new Date(meal.actualTime).getTime();
        const current = guardLatestTasks.get(meal.guard);
        if (!current || new Date(current.actualTime).getTime() < time) {
          guardLatestTasks.set(meal.guard, {
            type: 'meal',
            post: "אוכל",
            actualTime: meal.actualTime,
            thresholdMinutes: settings.mealThresholdMinutes
          });
        }
      });

      // Check only the latest task for each guard
      guardLatestTasks.forEach((task, guard) => {
        const taskTime = new Date(task.actualTime);
        const durationMinutes = (now.getTime() - taskTime.getTime()) / (1000 * 60);
        
        if (durationMinutes >= task.thresholdMinutes) {
          currentAlerts.push({
            guard: guard,
            post: task.post,
            duration: Math.floor(durationMinutes)
          });
        }
      });

      // Show toasts for new alerts only
      currentAlerts.forEach(alert => {
        const alertKey = `${alert.guard}-${alert.post}-${Math.floor(alert.duration / 5)}`; // Group by 5-minute intervals
        
        if (!shownAlertsRef.current.has(alertKey)) {
          shownAlertsRef.current.add(alertKey);
          toast.error(
            `התראה: ${alert.guard} ${alert.post} כבר ${alert.duration} דקות!`,
            {
              duration: 5000,
              icon: "⚠️"
            }
          );
        }
      });

      // Clean up old shown alerts that are no longer active
      const currentAlertKeys = new Set(
        currentAlerts.map(alert => `${alert.guard}-${alert.post}-${Math.floor(alert.duration / 5)}`)
      );
      
      shownAlertsRef.current.forEach(key => {
        const baseKey = key.split('-').slice(0, -1).join('-');
        const isStillActive = Array.from(currentAlertKeys).some(currentKey => 
          currentKey.startsWith(baseKey)
        );
        
        if (!isStillActive) {
          shownAlertsRef.current.delete(key);
        }
      });
    };

    // Check immediately
    checkAlerts();

    // Then check every 30 seconds
    const interval = setInterval(checkAlerts, 30000);

    return () => clearInterval(interval);
  }, []);
};
