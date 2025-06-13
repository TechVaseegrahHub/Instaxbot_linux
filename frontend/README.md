# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
src/
│
├── assets/                 # Static assets (images, icons, fonts, etc.)
│   └── icons/              # Icons used in the UI
├── components/             # Reusable components
│   ├── Sidebar.tsx         # Sidebar navigation
│   ├── Header.tsx          # Header (top navigation bar)
│   ├── AutomationCard.tsx  # Card component for automations
│   ├── ChatBox.tsx         # Chat window component for Live Chat
│   └── Button.tsx          # Reusable Button component
├── pages/                  # Pages for different parts of the app
│   ├── Dashboard.tsx       # Dashboard page
│   ├── Contacts.tsx        # Contacts page
│   ├── Automations.tsx     # Automations management page
│   ├── LiveChat.tsx        # Live chat page
│   └── Settings.tsx        # Settings page
├── services/               # Services for API interactions
│   ├── authService.ts      # Handles user authentication
│   └── chatService.ts      # Manages chat API calls
├── store/                  # Global state management (Redux, Zustand, or Context API)
│   ├── chatStore.ts        # Chat-related state management
│   └── userStore.ts        # User-related state management
├── styles/                 # Global and component-specific styles
│   ├── global.css          # Global styles
│   ├── Sidebar.module.css  # CSS module for Sidebar
│   └── ChatBox.module.css  # CSS module for ChatBox
├── types/                  # TypeScript interfaces and types
│   ├── authTypes.ts        # Types related to authentication
│   ├── chatTypes.ts        # Types for chat-related data
│   └── userTypes.ts        # User-related types
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts          # Hook to manage authentication state
│   └── useChat.ts          # Hook for fetching and handling chat data
├── App.tsx                 # Main application component
├── index.tsx               # Entry point for the React app
├── firebase.config.ts      # Firebase configuration (optional)
├── react-app-env.d.ts      # TypeScript definition for React
└── tsconfig.json           # TypeScript configuration
