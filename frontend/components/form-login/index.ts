import dynamic from 'next/dynamic';

export const FormLogin = dynamic(() => import('./form-login.component'), {
  ssr: false,
});
