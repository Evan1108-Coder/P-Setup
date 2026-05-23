import { useSyncExternalStore } from "react";
import type { AppStore, AppState } from "../../state/store.js";

export function useAppStore<T>(store: AppStore, selector: (state: AppState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}

export function useMessages(store: AppStore) {
  return useAppStore(store, (s) => s.messages);
}

export function useSteps(store: AppStore) {
  return useAppStore(store, (s) => s.steps);
}

export function useScan(store: AppStore) {
  return useAppStore(store, (s) => s.scan);
}

export function useIsRunning(store: AppStore) {
  return useAppStore(store, (s) => s.isRunning);
}

export function useIsComplete(store: AppStore) {
  return useAppStore(store, (s) => s.isComplete);
}
