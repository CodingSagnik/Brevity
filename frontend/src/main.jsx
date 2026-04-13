import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeModeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import App from "./App.jsx";

// ThemeModeProvider sits outermost so it owns the MUI ThemeProvider and
// CssBaseline. AuthProvider is nested inside so auth state can read the
// active theme if needed in the future.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeModeProvider>
  </React.StrictMode>
);
