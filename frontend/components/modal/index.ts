import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('./modal.component'), { ssr: false });
