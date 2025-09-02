import "./styles/Index.css"
import React from "react";
import { createRoot } from "react-dom/client";

// Import Amplify and configure it 
import { Amplify } from 'aws-amplify';
import config from '../amplify_outputs.json';
Amplify.configure(config);

import LandingPage from "./components/LandingPageComponent.tsx"

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <LandingPage /> 
  </React.StrictMode>
);