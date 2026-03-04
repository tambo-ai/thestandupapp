import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/api/auth/callback'],
  },
});

export const config = {
  matcher: [
    '/',
    '/app/:path*',
    '/api/auth/callback',
    '/workos/logout',
  ],
};
