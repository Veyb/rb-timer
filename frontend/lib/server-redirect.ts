// global modules
import Router from 'next/router';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function serverRedirect(ctx: any, location: string) {
  if (!isBrowser() && ctx.res) {
    ctx.res.writeHead(302, {
      Location: location,
      'Content-Type': 'text/html; charset=utf-8',
    });
    ctx.res.end();
  } else {
    Router.replace(location);
  }
}
