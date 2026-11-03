import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { GuestRoute, ProtectedRoute } from './components/ProtectedRoute.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import IssuesPage from './pages/IssuesPage.jsx';
import ProjectDetailsPage from './pages/ProjectDetailsPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import { ToastProvider } from './components/ui.jsx';

function NotFoundPage() {
  return (
    <div className="empty">
      <h3>Page not found</h3>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="btn">Go to dashboard</Link>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailsPage />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </ToastProvider>
  );
}
