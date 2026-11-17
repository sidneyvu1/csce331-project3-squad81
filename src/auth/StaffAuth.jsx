import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { Link, useNavigate } from 'react-router-dom';
import { translate as t } from '../components/kiosk/kioskText';

const StaffContext = createContext(null);
const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
const configured = Boolean(domain && clientId && audience);

export function StaffProvider({ children }) {
  const navigate = useNavigate();
  if (!configured) return <StaffContext.Provider value={{ configured: false, loading: false }}>{children}</StaffContext.Provider>;
  return <Auth0Provider domain={domain} clientId={clientId}
    authorizationParams={{ redirect_uri: window.location.origin, audience, scope: 'openid profile email' }}
    onRedirectCallback={(state) => { navigate(state?.returnTo && /^\/(manager|cashier|kitchen)$/.test(state.returnTo) ? state.returnTo : '/', { replace: true }); }}>
    <StaffSession>{children}</StaffSession>
  </Auth0Provider>;
}

function StaffSession({ children }) {
  const auth = useAuth0();
  const [staff, setStaff] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState('');
  const request = useCallback(async (url, options = {}) => {
    const token = await auth.getAccessTokenSilently();
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  }, [auth.getAccessTokenSilently]);
  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setError('');
    try {
      const response = await request('/api/auth/me');
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Staff sign-in service is unavailable. Restart the backend and try again.');
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load staff access.');
      setStaff(data.staff);
    } catch (failure) { setStaff(null); setError(failure.message); }
    finally { setLoadingProfile(false); }
  }, [request]);
  useEffect(() => { if (auth.isAuthenticated) loadProfile(); else setStaff(null); }, [auth.isAuthenticated, loadProfile]);
  return <StaffContext.Provider value={{ configured: true, loading: auth.isLoading || loadingProfile, authenticated: auth.isAuthenticated, staff,
    error: auth.error?.message || error, request, retry: loadProfile,
    login: (returnTo) => auth.loginWithRedirect({ appState: { returnTo } }).catch((failure) => setError(failure.message)),
    logout: () => auth.logout({ logoutParams: { returnTo: window.location.origin } }) }}>{children}</StaffContext.Provider>;
}

export function useStaff() { return useContext(StaffContext); }

export function StaffControls({ language = 'en' } = {}) {
  const auth = useStaff();
  if (!auth.configured) return null;
  const name = auth.staff?.display_name;
  return <div className="cashier-header-actions staff-controls">
    {auth.staff && <span className="staff-chip">
      <span className="staff-avatar" aria-hidden="true">{(name || '?').trim().charAt(0).toUpperCase()}</span>
      <span className="staff-name">{name}</span>
      <span className="staff-role">{auth.staff.role}</span>
    </span>}
    {auth.authenticated && <button className="manager-small-button" onClick={auth.logout}>{t(language, 'logOut')}</button>}
  </div>;
}

export function StaffRoute({ roles, children }) {
  const auth = useStaff();
  if (auth.loading) return <div className="hub-container" role="status">Checking staff access…</div>;
  if (auth.staff && roles.includes(auth.staff.role)) return children;
  const message = !auth.configured ? 'Staff sign-in has not been configured yet.' : auth.error || (auth.authenticated ? 'Your account does not have access to this area.' : 'Sign in with your staff account to continue.');
  const isProblem = !auth.configured || Boolean(auth.error) || auth.authenticated;
  return <div className="hub-container">
    <main className="staff-access-card">
      <div className="staff-access-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
      </div>
      <p className="kiosk-eyebrow">Bubble Tea POS</p>
      <h1>Staff access</h1>
      <p className={isProblem ? 'staff-access-message staff-access-message-problem' : 'staff-access-message'} role={isProblem ? 'alert' : undefined}>{message}</p>
      <div className="staff-access-actions">
        {auth.configured && !auth.authenticated && <button className="submit-order-button" onClick={() => auth.login(window.location.pathname)}>Sign in</button>}
        {auth.authenticated && <>
          <button className="submit-order-button" onClick={auth.retry}>Retry access</button>
          <button className="manager-small-button" onClick={() => auth.login(window.location.pathname)}>Sign in again</button>
          <button className="manager-small-button" onClick={auth.logout}>Log out</button>
        </>}
        <Link className="staff-access-home" to="/">Back to home</Link>
      </div>
    </main>
  </div>;
}
