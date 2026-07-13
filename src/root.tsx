import { useLayoutEffect, type ReactNode } from 'react';
import { Links, Meta, Outlet, Scripts, useLocation } from 'react-router';
import '@shared/styles/global.css';

type LayoutProps = {
  children: ReactNode;
};

const RouteScrollManager = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    history.scrollRestoration = 'manual';
    window.scrollTo({ left: 0, top: 0 });
  }, [pathname]);

  return null;
};

export const Layout = ({ children }: LayoutProps) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta content="width=device-width, initial-scale=1" name="viewport" />
      <link href="/favicon.png" rel="icon" type="image/svg+xml" />
      <Meta />
      <Links />
    </head>
    <body>
      {children}
      <Scripts />
    </body>
  </html>
);

export const HydrateFallback = () => null;

const Root = () => (
  <>
    <RouteScrollManager />
    <Outlet />
  </>
);

export default Root;
