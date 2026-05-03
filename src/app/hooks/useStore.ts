import { useState, useEffect } from 'react';
import { appStore } from '../store';
import { AppState } from '../types';

export function useStore() {
  const [state, setState] = useState<AppState>(appStore.getState());

  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      setState(appStore.getState());
    });
    return unsubscribe;
  }, []);

  return { state, store: appStore };
}
