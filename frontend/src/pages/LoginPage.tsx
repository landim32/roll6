import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Tabs } from '../components/ui/Tabs';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { isTablePath } from '../lib/tableRoute';
import { BrandLogo } from '../components/ui/BrandLogo';

/** Address to open after login: the campaign or map the user asked for, otherwise the table root. */
const destinationFrom = (state: unknown): string => {
  const from = (state as { from?: string } | null)?.from;
  return from && isTablePath(from) ? from : '/';
};

const MIN_PASSWORD_LENGTH = 8;

/** Simple dark login screen with "Entrar" and "Criar conta" tabs. */
export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, register, loading } = useAuth();
  // Nothing of the table shows on the login page, nor in its tab (040).
  useDocumentTitle({ mapName: null, campaignName: null, isCampaignMap: false });
  const [tab, setTab] = useState('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated) return <Navigate to={destinationFrom(location.state)} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const isSignUp = tab === 'signUp';
    if (!email.trim() || !password || (isSignUp && !name.trim())) {
      toast.error(t('login.required'));
      return;
    }
    if (isSignUp && password.length < MIN_PASSWORD_LENGTH) {
      toast.error(t('login.shortPassword'));
      return;
    }
    try {
      const session = isSignUp
        ? await register({ name: name.trim(), email: email.trim(), password })
        : await login({ email: email.trim(), password });
      toast.success(t(isSignUp ? 'toast.accountCreated' : 'toast.welcome', { name: session.user.name }));
      navigate(destinationFrom(location.state), { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  return (
    <div className="stm-login">
      {/* The vertical logo over the card (038); the heading stays for screen readers. */}
      <BrandLogo variant="vertical" className="stm-login-logo" />
      <div className="stm-login-card">
        <h1 className="visually-hidden">{t('common.appName')}</h1>
        <Tabs
          tabs={[{ key: 'signIn', label: t('login.signInTab') }, { key: 'signUp', label: t('login.signUpTab') }]}
          active={tab}
          onChange={setTab}
        />
        <form onSubmit={handleSubmit} noValidate>
          {tab === 'signUp' && (
            <div className="mb-3">
              <label className="form-label" htmlFor="login-name">{t('login.name')}</label>
              <input id="login-name" className="form-control" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
          )}
          <div className="mb-3">
            <label className="form-label" htmlFor="login-email">{t('login.email')}</label>
            <input id="login-email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="login-password">{t('login.password')}</label>
            <input
              id="login-password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === 'signUp' ? 'new-password' : 'current-password'}
            />
            {tab === 'signUp' && <div className="form-text">{t('login.passwordHint')}</div>}
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? t('common.loading') : t(tab === 'signUp' ? 'login.signUp' : 'login.signIn')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
