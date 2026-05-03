import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { useStore } from './hooks/useStore';

export function App() {
  const { state, store } = useStore();

  useEffect(() => {
    store.initializeAuth();
  }, [store]);

  if (state.isLoading) {
    return <div className="flex items-center justify-center h-screen bg-black text-white">Loading...</div>;
  }

  return <RouterProvider router={router} />;
}