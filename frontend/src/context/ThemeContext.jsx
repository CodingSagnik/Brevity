import { createContext, useContext, useState, useMemo } from "react";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  CssBaseline,
} from "@mui/material";

const ThemeModeCtx = createContext({ mode: "light", toggleMode: () => {} });

export const useThemeMode = () => useContext(ThemeModeCtx);

// ─── Design token factory ─────────────────────────────────────────────────────
//
// The entire Neo-Brutalist aesthetic is driven by a single variable: INK.
//
//   Light mode  →  INK = "#111111"  (pitch black on warm off-white)
//   Dark  mode  →  INK = "#FFFFFF"  (pure white on charcoal)
//
// Inverting INK instead of softening it preserves the heavy, physical feel of
// the design in both modes. Every border, every offset shadow, every separator
// uses this token — so the whole UI flips coherently with one variable.

function createBrevityTheme(mode) {
  const isDark = mode === "dark";
  const INK = isDark ? "#FFFFFF" : "#111111";

  const B       = `2px solid ${INK}`;
  const S       = `4px 4px 0px ${INK}`;
  const S_HOVER  = `2px 2px 0px ${INK}`;
  const S_ACTIVE = `0px 0px 0px ${INK}`;

  return createTheme({
    palette: {
      mode,
      primary:    { main: "#FF5C28", contrastText: "#FFFFFF" },
      success:    { main: "#16a34a",  contrastText: "#FFFFFF" },
      error:      { main: isDark ? "#F87171" : "#DC2626" },
      background: {
        default: isDark ? "#1A1A1A" : "#F4F4F0",
        paper:   isDark ? "#262626" : "#FFFFFF",
      },
      text: {
        primary:   isDark ? "#F0F0F0" : "#111111",
        secondary: isDark ? "#888888" : "#555555",
      },
      divider: isDark ? "#444444" : "#CCCCCC",
    },

    shape: { borderRadius: 0 },

    typography: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      h4:      { fontWeight: 800, letterSpacing: "-0.02em" },
      h5:      { fontWeight: 800 },
      h6:      { fontWeight: 700 },
      button:  { textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" },
      caption: { fontWeight: 500 },
    },

    components: {
      // ── Buttons ──────────────────────────────────────────────────────────────
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            transition: "transform 0.1s ease, box-shadow 0.1s ease",
          },
          contained: {
            border: B,
            boxShadow: S,
            "&:hover":  { transform: "translate(2px, 2px)", boxShadow: S_HOVER  },
            "&:active": { transform: "translate(4px, 4px)", boxShadow: S_ACTIVE },
            "&.Mui-disabled": {
              border:          `2px solid ${isDark ? "#555" : "#BBBBBB"}`,
              boxShadow:       `4px 4px 0px ${isDark ? "#555" : "#BBBBBB"}`,
              color:           isDark ? "#666" : "#BBBBBB",
              backgroundColor: isDark ? "#2A2A2A" : "#F5F5F5",
            },
          },
          containedPrimary: {
            backgroundColor: "#FF5C28",
            "&:hover": { backgroundColor: "#E54D1F" },
          },
          containedSuccess: {
            backgroundColor: "#16a34a",
            "&:hover": { backgroundColor: "#15803d" },
          },
          outlined: {
            border:          B,
            boxShadow:       S,
            backgroundColor: isDark ? "#262626" : "#FFFFFF",
            color:           isDark ? "#F0F0F0" : "#111111",
            "&:hover": {
              transform:       "translate(2px, 2px)",
              boxShadow:       S_HOVER,
              backgroundColor: isDark ? "#333333" : "#F4F4F0",
              border: B,
            },
            "&:active": { transform: "translate(4px, 4px)", boxShadow: S_ACTIVE },
            "&.Mui-disabled": {
              border:    `2px solid ${isDark ? "#444" : "#CCCCCC"}`,
              boxShadow: "none",
              color:     isDark ? "#555" : "#CCCCCC",
            },
          },
          text: {
            border:    "none",
            boxShadow: "none",
            "&:hover": { backgroundColor: "transparent", textDecoration: "underline", boxShadow: "none" },
            "&.Mui-disabled": { border: "none", boxShadow: "none" },
          },
          sizeSmall: { padding: "5px 12px",  fontSize: "0.72rem" },
          sizeLarge: { padding: "12px 28px", fontSize: "0.95rem" },
        },
      },

      // ── Cards and Papers ─────────────────────────────────────────────────────
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 0, border: B, boxShadow: S },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root:       { borderRadius: 0 },
          elevation0: { border: B, boxShadow: S },
        },
      },

      // ── TextFields ───────────────────────────────────────────────────────────
      //
      // Focus state: border thickens to 3px + solid offset shadow.
      // MUI's blue ring is entirely replaced — no glow in either mode.
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 0,
              backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: INK, borderWidth: "2px", transition: "none",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: INK, borderWidth: "2px",
              },
              "&.Mui-focused": {
                boxShadow: `3px 3px 0px ${INK}`,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: INK, borderWidth: "3px",
                },
              },
              "&.Mui-error .MuiOutlinedInput-notchedOutline": {
                borderColor: isDark ? "#F87171" : "#DC2626",
              },
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: isDark ? "#F0F0F0" : "#111111",
            },
          },
        },
      },

      // ── AppBar ───────────────────────────────────────────────────────────────
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
            color:           isDark ? "#F0F0F0" : "#111111",
            boxShadow:  "none",
            border:     "none",
            borderBottom: `3px solid ${INK}`,
          },
        },
      },

      // ── Dialog gets a heavier shadow for visual hierarchy ────────────────────
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            border:    `3px solid ${INK}`,
            boxShadow: `8px 8px 0px ${INK}`,
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root:     { borderRadius: 0, fontWeight: 600, border: `1.5px solid ${INK}` },
          outlined: { border: `1.5px solid ${INK}` },
          filled:   { border: `1.5px solid ${INK}` },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 0, border: B, boxShadow: `3px 3px 0px ${INK}` },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: { borderColor: isDark ? "#444444" : "#CCCCCC" },
        },
      },

      MuiTabs: {
        styleOverrides: {
          root:      { borderBottom: `2px solid ${INK}` },
          indicator: { backgroundColor: INK, height: 3 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "0.78rem",
            "&.Mui-selected": { color: isDark ? "#F0F0F0" : "#111111" },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: `1px solid ${isDark ? "#3A3A3A" : "#CCCCCC"}` },
          head: {
            fontWeight: 800,
            backgroundColor: isDark ? "#1E1E1E" : "#F4F4F0",
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: isDark ? "#888888" : "#555555",
            borderBottom: `3px solid ${INK}`,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { "&:hover": { backgroundColor: isDark ? "#2A2A2A" : "#FFF5EE" } },
        },
      },

      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 0 } },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 0,
            backgroundColor: isDark ? "#F0F0F0" : "#111111",
            color:           isDark ? "#111111" : "#FFFFFF",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: `1px solid ${INK}`,
          },
          arrow: { color: isDark ? "#F0F0F0" : "#111111" },
        },
      },

      MuiSkeleton: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            ...(isDark && { backgroundColor: "#333333" }),
          },
        },
      },
    },
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem("brevity-theme") || "light";
    } catch {
      return "light";
    }
  });

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try { localStorage.setItem("brevity-theme", next); } catch {}
      return next;
    });
  };

  // useMemo so the heavy createTheme call only runs when mode actually changes.
  const theme = useMemo(() => createBrevityTheme(mode), [mode]);

  return (
    <ThemeModeCtx.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        {/* CssBaseline lives here so it always reflects the active palette. */}
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeCtx.Provider>
  );
}
