import React from 'react';
import { createRoot } from 'react-dom/client';

/* Components */
import PopupPage from '@/pages/PopupPage'; 

/* CSS styles */
import "@/styles/Index.css";

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <PopupPage />
  </React.StrictMode>
);