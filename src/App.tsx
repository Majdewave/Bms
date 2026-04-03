
import { useEffect } from 'react';
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
