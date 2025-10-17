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

      // Check assignments (posts)
      data.assignments.forEach(assignment => {
        if (!assignment.actualTime) return;
        
        const assignmentTime = new Date(assignment.actualTime);
        const durationMinutes = (now.getTime() - assignmentTime.getTime()) / (1000 * 60);
        
        if (durationMinutes >= settings.alertThresholdMinutes) {
          currentAlerts.push({
            guard: assignment.guard,
            post: `עמדה: ${assignment.post}`,
            duration: Math.floor(durationMinutes)
          });
        }
      });
      
      // Check breaks
      data.breaks.forEach(breakAssignment => {
        if (!breakAssignment.actualTime) return;
        
        const breakTime = new Date(breakAssignment.actualTime);
        const durationMinutes = (now.getTime() - breakTime.getTime()) / (1000 * 60);
        
        if (durationMinutes >= settings.breakThresholdMinutes) {
          currentAlerts.push({
            guard: breakAssignment.guard,
            post: "הפסקה",
            duration: Math.floor(durationMinutes)
          });
        }
      });
      
      // Check meals
      data.meals.forEach(meal => {
        if (!meal.actualTime) return;
        
        const mealTime = new Date(meal.actualTime);
        const durationMinutes = (now.getTime() - mealTime.getTime()) / (1000 * 60);
        
        if (durationMinutes >= settings.mealThresholdMinutes) {
          currentAlerts.push({
            guard: meal.guard,
            post: "אוכל",
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
