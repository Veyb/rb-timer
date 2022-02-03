import dynamic from 'next/dynamic';

export const FormRegister = dynamic(() => import('./form-register.component'), {
  ssr: false,
});
