import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';

const StaffContext = createContext(null);
const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
const configured = Boolean(domain && clientId && audience);

export function StaffProvider({ children }) {
  if (!configured) return <StaffContext.Provider value={{ configured: false, loading: false }}>{children}</StaffContext.Provider>;
  return <Auth0Provider domain={domain} clientId={clientId}
    authorizationParams={{ redirect_uri: window.location.origin, audience, scope: 'openid profile email' }}
    onRedirectCallback={(state) => { window.location.replace(state?.returnTo && /^\/(manager|cashier|kitchen)$/.test(state.returnTo) ? state.returnTo : '/'); }}>
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

export function StaffControls() {
  const auth = useStaff();
  if (!auth.configured) return null;
  return <div className="cashier-header-actions staff-controls">
    {auth.staff && <span>{auth.staff.display_name} · {auth.staff.role}</span>}
    {auth.authenticated && <button className="manager-small-button" onClick={auth.logout}>Log out</button>}
  </div>;
}

export function StaffRoute({ roles, children }) {
  const auth = useStaff();
  if (auth.loading) return <div className="hub-container" role="status">Checking staff access…</div>;
  if (auth.staff && roles.includes(auth.staff.role)) return children;
  return <div className="hub-container">
    <h1>Staff access</h1>
    <p>{!auth.configured ? 'Staff sign-in has not been configured yet.' : auth.error || (auth.authenticated ? 'Your account does not have access to this area.' : 'Sign in with your staff account to continue.')}</p>
    {auth.configured && !auth.authenticated && <button className="submit-order-button" onClick={() => auth.login(window.location.pathname)}>Sign in</button>}
    {auth.authenticated && <><button className="manager-small-button" onClick={auth.retry}>Retry access</button><button className="manager-small-button" onClick={() => auth.login(window.location.pathname)}>Sign in again</button><StaffControls /></>}
    <Link className="home-button" to="/">Home</Link>
  </div>;
}
