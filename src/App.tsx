
import { useEffect } from 'react';
import { updateLastActivity } from './api/sessionManager';
import { useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { FeatureProvider } from '@/contexts/FeatureContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { router } from '@/router';
import '@/styles/index.css';

export default function App() {
  const { i18n } = useTranslation();


  useEffect(() => {
    document.documentElement.dir = i18n.dir();
  }, [i18n.language]);

  // Session activity tracking
  useEffect(() => {
    const activityHandler = () => updateLastActivity();
    window.addEventListener('click', activityHandler, true);
    window.addEventListener('keydown', activityHandler, true);
    return () => {
      window.removeEventListener('click', activityHandler, true);
      window.removeEventListener('keydown', activityHandler, true);
    };
  }, []);

  return (
    <AuthProvider>
      <TenantProvider>
        <FeatureProvider>
          <RouterProvider router={router} />
        </FeatureProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
