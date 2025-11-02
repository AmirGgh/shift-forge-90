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

      // מאבטח יכול להיות רק בפעילות אחת - מחפשים את הפעילות האחרונה לפי actualTime
      const guardLatestActivity = new Map<string, { type: string; post: string; actualTime: string; thresholdMinutes: number }>();

      // אוספים את כל הפעילויות ושומרים רק את האחרונה לכל מאבטח
      data.assignments.forEach(assignment => {
        if (!assignment.actualTime) return;
        const time = new Date(assignment.actualTime).getTime();
        const current = guardLatestActivity.get(assignment.guard);
        if (!current || new Date(current.actualTime).getTime() < time) {
          guardLatestActivity.set(assignment.guard, {
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
        const current = guardLatestActivity.get(patrol.guard);
        if (!current || new Date(current.actualTime).getTime() < time) {
          guardLatestActivity.set(patrol.guard, {
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
        const current = guardLatestActivity.get(breakAssignment.guard);
        if (!current || new Date(current.actualTime).getTime() < time) {
          guardLatestActivity.set(breakAssignment.guard, {
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
        const current = guardLatestActivity.get(meal.guard);
        if (!current || new Date(current.actualTime).getTime() < time) {
          guardLatestActivity.set(meal.guard, {
            type: 'meal',
            post: "אוכל",
            actualTime: meal.actualTime,
            thresholdMinutes: settings.mealThresholdMinutes
          });
        }
      });

      // בודקים רק את הפעילות האחרונה של כל מאבטח
      guardLatestActivity.forEach((activity, guard) => {
        const activityTime = new Date(activity.actualTime);
        const durationMinutes = (now.getTime() - activityTime.getTime()) / (1000 * 60);
        
        // מתריעים רק אם עבר מספיק זמן מהפעילות האחרונה
        if (durationMinutes >= activity.thresholdMinutes) {
          currentAlerts.push({
            guard: guard,
            post: activity.post,
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
              icon: "⚠️",
              style: {
                background: 'hsl(0 84.2% 60.2%)',
                color: 'white',
                border: '1px solid hsl(0 84.2% 50%)'
              }
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
