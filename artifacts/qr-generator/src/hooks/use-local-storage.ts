import { useCallback, useState } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  onQuotaExceeded?: () => void
) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // Uses the functional form of setStoredValue so the updater always sees the
  // latest state, even if setValue is called multiple times in the same tick
  // (previously this read `storedValue` from the render closure, which could
  // be stale and silently drop updates).
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
          console.error(error);
          // Most commonly a QuotaExceededError. The in-memory state still
          // updates below so the UI stays consistent for this session, but
          // let the caller know persistence failed so it can notify the user.
          onQuotaExceeded?.();
        }
      }
      return valueToStore;
    });
  }, [key, onQuotaExceeded]);

  return [storedValue, setValue] as const;
}
