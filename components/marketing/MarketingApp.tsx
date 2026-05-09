import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import LegalPage, { LegalPageKey } from './LegalPage';

export type MarketingRoute =
  | 'landing'
  | 'login'
  | 'register'
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

const MarketingApp: React.FC<MarketingAppProps> = ({ initialRoute = 'landing', onAuthenticated }) => {
  const [route, setRoute] = useState<MarketingRoute>(initialRoute);

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
  if (isLegal(route)) {
    return <LegalPage page={route} onNavigate={navigate} />;
  }
  return <LandingPage onNavigate={navigate} />;
};

export default MarketingApp;
