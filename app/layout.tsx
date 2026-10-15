import './globals.css';
import ModalScrollLock from './modal-scroll-lock';
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover'};
export const metadata={manifest:'/site.webmanifest',appleWebApp:{capable:true,title:'Dental Stars',statusBarStyle:'default'},title:'Dental Stars · Asset Manager',description:'Equipment, assignments and asset reporting for Dental Stars.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="stylesheet" href="/asset-manager.css?v=20261009-0456"/></head><body><ModalScrollLock/>{children}</body></html>}
