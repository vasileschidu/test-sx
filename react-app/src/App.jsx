import { useEffect, useMemo, useState } from 'react';
import './App.css';
import smartExchangePageUrl from '../../src/pages/dashboard/smart-exchange.html?url';
import { AppShell } from '@/components/AppShell';
import { getPayables, getPaymentPreferences, getVendorById, getVendors } from '@/data/adapters';
import { DesignSystemPage } from '@/features/design-system/DesignSystemPage';
import { PayablesPage } from '@/features/payables/PayablesPage';
import { PaymentPreferencesPage } from '@/features/payment-preferences/PaymentPreferencesPage';
import { VendorProfilePage } from '@/features/vendors/VendorProfilePage';
import { VendorsPage } from '@/features/vendors/VendorsPage';

const ROUTE_MAP = {
  '/smart-exchange': smartExchangePageUrl,
};

function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#/, '') || '/payables';

  if (hash === '/design-system') {
    return { kind: 'react', page: 'design-system' };
  }

  if (hash === '/payables') {
    return { kind: 'react', page: 'payables' };
  }

  if (hash.startsWith('/vendors/')) {
    const vendorId = hash.replace('/vendors/', '');
    return {
      kind: 'react',
      page: 'vendor-profile',
      vendorId: decodeURIComponent(vendorId),
    };
  }

  if (hash === '/vendors') {
    return { kind: 'react', page: 'vendors' };
  }

  if (hash === '/payment-preferences') {
    return { kind: 'react', page: 'payment-preferences' };
  }

  return {
    kind: 'frame',
    src: ROUTE_MAP[hash] || ROUTE_MAP['/smart-exchange'],
  };
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromHash);

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = '/payables';
    }
  }, []);

  const frameKey = useMemo(
    () => (route.kind === 'frame' ? route.src : route.page),
    [route],
  );

  if (route.kind === 'react') {
    if (route.page === 'design-system') {
      return <DesignSystemPage />;
    }

    let content = null;

    if (route.page === 'vendors') {
      content = <VendorsPage vendors={getVendors()} />;
    }

    if (route.page === 'vendor-profile') {
      content = <VendorProfilePage vendor={getVendorById(route.vendorId)} />;
    }

    if (route.page === 'payment-preferences') {
      content = <PaymentPreferencesPage data={getPaymentPreferences()} />;
    }

    if (route.page === 'payables') {
      content = <PayablesPage payables={getPayables()} />;
    }

    if (content) {
      return <AppShell route={route}>{content}</AppShell>;
    }
  }

  return (
    <div className="legacy-frame-shell">
      <iframe
        key={frameKey}
        className="legacy-frame"
        title="React parity preview"
        src={route.src}
      />
    </div>
  );
}
