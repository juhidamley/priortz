import { createBrowserRouter } from 'react-router';
import { QueueList } from './components/QueueList';
import { QueueView } from './components/QueueView';
import { Login } from './components/Login';
import { RootLayout } from './Layouts';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', Component: QueueList },
      { path: '/queue/:queueId', Component: QueueView },
      { path: '/login', Component: Login },
    ],
  },
]);