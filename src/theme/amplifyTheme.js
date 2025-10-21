
import { createTheme } from '@aws-amplify/ui-react';


// Tailwind-aligned Amplify theme
export const amplifyTheme = createTheme({
  name: 'mindful',
  tokens: {
    colors: {
      brand: {
        primary: {  // buttons, links, active tabs
          10: { value: '#eff6ff' },   // blue-50
          20: { value: '#bfdbfe' },   // blue-200
          40: { value: '#60a5fa' },   // blue-400
          60: { value: '#2563eb' },   // blue-600
          80: { value: '#1d4ed8' },   // blue-700
          90: { value: '#1e3a8a' },   // blue-900
        },
      },
      background: { primary: { value: 'transparent' } }, // let your page bg show through
      font: { primary: { value: 'inherit' } },           // use your Tailwind font
    },
    borderWidths: {
      small: { value: '0' },
      medium: { value: '0' },
      large: { value: '0' },
    },
    components: {
      button: {
        primary: {
          backgroundColor: { value: '{colors.brand.primary.60}' }, 
          _hover: { backgroundColor: { value: '{colors.brand.primary.40}' } },
        },
        paddingInlineStart: { value: '1rem' },
        paddingInlineEnd: { value: '1rem' },
      },
    },
    fieldset: { borderWidth: { value: '0' } },
    card: { borderWidth: { value: '0' }, boxShadow: { value: 'none' } },
    radii: { small: '0.5rem', medium: '0.75rem', large: '1rem', xl: '1rem', xxl: '1.5rem' },
    shadows: { small: { value: 'none' }, medium: { value: 'none' } },
  },
 });