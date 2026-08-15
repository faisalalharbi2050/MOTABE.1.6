import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import LegalPage, { LegalPageKey } from './LegalPage';
import DelegateActivationPage from './DelegateActivationPage';

export type MarketingRoute =
  | 'landing'
  | 'login'
  | 'register'
  | 'delegate-activation'
  | 'faq'
  | 'privacy'
  | 'terms'
  | 'refund'
  | 'contact';

interface MarketingAppProps {
  initialRoute?: MarketingRoute;
  onAuthenticated: () => void;
}

const isLegal = (r: MarketingRoute): r is LegalPageKey =>
  r === 'faq' || r === 'privacy' || r === 'terms' || r === 'refund' || r === 'contact';

const resolveInitialRoute = (fallback: MarketingRoute): MarketingRoute => {
  if (typeof window === 'undefined') return fallback;
  const params = new URLSearchParams(window.location.search);
  return params.has('activationCode') || params.get('page') === 'delegate-activation'
    ? 'delegate-activation'
    : fallback;
};

const MarketingApp: React.FC<MarketingAppProps> = ({ initialRoute = 'landing', onAuthenticated }) => {
  const [route, setRoute] = useState<MarketingRoute>(() => resolveInitialRoute(initialRoute));

  // Smooth scroll to top on every route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [route]);

  const navigate = (r: MarketingRoute) => setRoute(r);

  if (route === 'login') {
    return <LoginPage onNavigate={navigate} onAuthenticated={onAuthenticated} />;
  }
  if (route === 'register') {
    return <RegisterPage onNavigate={navigate} onAuthenticated={onAuthenticated} />;
  }
  if (route === 'delegate-activation') {
    return <DelegateActivationPage onNavigate={navigate} onAuthenticated={onAuthenticated} />;
  }
  if (isLegal(route)) {
    return <LegalPage page={route} onNavigate={navigate} />;
  }
  return <LandingPage onNavigate={navigate} />;
};

export default MarketingApp;
