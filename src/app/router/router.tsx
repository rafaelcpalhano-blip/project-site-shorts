import { FatalPage } from '../../components/clipper/ClipperFailure'
import { AdminSessionProvider } from '../../features/admin/context/AdminSessionProvider'
import { createBrowserRouter } from 'react-router-dom'
import { SiteLayout } from '../../components/layout/SiteLayout'
import { NotFoundPage } from '../../components/ui/NotFoundPage'
import { HomePage } from '../../features/shorts/pages/HomePage'
import { GamePage } from '../../features/games/pages/GamePage'
import { AdminPage } from '../../features/admin/pages/AdminPage'

export const router = createBrowserRouter([
  {
    element: <AdminSessionProvider><SiteLayout /></AdminSessionProvider>,
    errorElement: <FatalPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/jogos/:gameId', element: <GamePage /> },
      { path: '/admin', element: <AdminPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
