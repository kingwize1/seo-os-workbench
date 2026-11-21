import React from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { AdminPage } from '@/pages/AdminPage';
import { BrainPage } from '@/pages/BrainPage';
import { BusinessOverviewPage } from '@/pages/BusinessOverviewPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { CoworkersPage } from '@/pages/CoworkersPage';
import { DeskHomePage } from '@/pages/DeskHomePage';
import { IntegrationsPage } from '@/pages/IntegrationsPage';
import { LandingPage } from '@/pages/LandingPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { OrchestratorPage } from '@/pages/OrchestratorPage';
import { PersonalAgentPage } from '@/pages/PersonalAgentPage';
import { PersonalOverviewPage } from '@/pages/PersonalOverviewPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SpacesPage } from '@/pages/SpacesPage';
import { TasksPage } from '@/pages/TasksPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public & Commercial Funnel Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/personal" element={<PersonalOverviewPage />} />
      <Route path="/personal/agent" element={<PersonalAgentPage />} />
      <Route path="/business" element={<BusinessOverviewPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Authenticated SEO OS Business Desk Routes */}
      <Route path="/desk" element={<DeskHomePage />} />
      <Route path="/desk/orchestrator" element={<OrchestratorPage />} />
      <Route path="/desk/clients" element={<ClientsPage />} />
      <Route path="/desk/clients/:clientId" element={<ClientsPage />} />
      <Route path="/desk/coworkers" element={<CoworkersPage />} />
      <Route path="/desk/coworkers/:coworkerId" element={<CoworkersPage />} />
      <Route path="/desk/spaces" element={<SpacesPage />} />
      <Route path="/desk/tasks" element={<TasksPage />} />
      <Route path="/desk/brain" element={<BrainPage />} />
      <Route path="/desk/reports" element={<ReportsPage />} />
      <Route path="/desk/integrations" element={<IntegrationsPage />} />
      <Route path="/desk/admin" element={<AdminPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  const useHash =
    import.meta.env.VITE_STATIC_DEMO_MODE === 'true' ||
    (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io'));

  const Router = useHash ? HashRouter : BrowserRouter;

  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}

export default App;
