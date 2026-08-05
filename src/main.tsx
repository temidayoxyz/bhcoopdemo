import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installStaticDemoFetch } from './static-demo/install';

// GitHub Pages builds run without Express; install in-browser mock API.
installStaticDemoFetch();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
