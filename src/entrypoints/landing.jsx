import React from "react";
import { createRoot } from "react-dom/client";

/* Configure Amplify */
import { Amplify } from 'aws-amplify';
import config from '/amplify_outputs.json';
Amplify.configure(config);

/* Components */
import LandingPage from "@/pages/LandingPage.tsx"

/* CSS styles */
import "@/styles/Index.css"

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <LandingPage /> 
  </React.StrictMode>
);