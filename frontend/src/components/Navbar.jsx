import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Typography,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  useTheme,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";

/**
 * Navbar layout (authenticated)
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  [■] Brevity           [☀/☾]   Dashboard   [johndoe ▾]          │
 * └──────────────────────────────────────────────────────────────────┘
 *                                                         ↓ dropdown
 *                                                   ┌─────────────┐
 *                                                   │ Log Out     │
 *                                                   └─────────────┘
 *
 * Left  — brand mark + wordmark
 * Right — Theme toggle · Dashboard · User badge (dropdown trigger)
 */
export default function Navbar({ onOpenAuth, onNavigate }) {
  const { isAuthenticated, user, logout } = useAuth();
  const { toggleMode } = useThemeMode();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const INK = isDark ? "#FFFFFF" : "#111111";

  // User menu anchor
  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);
  const openMenu  = (e) => setMenuAnchor(e.currentTarget);
  const closeMenu = ()  => setMenuAnchor(null);

  // Display only the local-part of the email (before "@").
  const username = user?.email?.split("@")[0] ?? "";

  // ── Shared stamp-button base sx ──────────────────────────────────────────
  // All stamp surfaces share this geometry; colour tokens are overridden per site.
  const stampBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontFamily: '"Space Grotesk", sans-serif',
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    lineHeight: 1,
    outline: "none",
    transition: "transform 0.1s ease, box-shadow 0.1s ease, background-color 0.1s ease",
  };

  // ── Theme toggle (icon-only) ─────────────────────────────────────────────
  const ThemeToggle = (
    <Tooltip title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      <Box
        component="button"
        onClick={toggleMode}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        sx={{
          ...stampBase,
          width: 36,
          height: 36,
          border: `2px solid ${INK}`,
          boxShadow: `3px 3px 0px ${INK}`,
          bgcolor: isDark ? "#333333" : "#F4F4F0",
          color: isDark ? "#F0F0F0" : "#111111",
          "&:hover":  { transform: "translate(2px, 2px)", boxShadow: `1px 1px 0px ${INK}` },
          "&:active": { transform: "translate(3px, 3px)", boxShadow: `0px 0px 0px ${INK}` },
        }}
      >
        {isDark ? <LightModeIcon sx={{ fontSize: 16 }} /> : <DarkModeIcon sx={{ fontSize: 16 }} />}
      </Box>
    </Tooltip>
  );

  return (
    <AppBar position="fixed" elevation={0}>
      <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, sm: 3 }, gap: 2 }}>

        {/* ── LEFT — brand ─────────────────────────────────────────────────── */}
        <Box
          onClick={() => onNavigate("home")}
          sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer", flexShrink: 0 }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              bgcolor: isDark ? "#FF5C28" : "#111111",
              border: `2px solid ${INK}`,
              flexShrink: 0,
            }}
          >
            <LinkIcon sx={{ color: isDark ? "#FFFFFF" : "#FF5C28", fontSize: 18 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, fontSize: "1.15rem", color: "text.primary", letterSpacing: "-0.02em" }}
          >
            Brevity
          </Typography>
        </Box>

        {/* ── RIGHT — controls ─────────────────────────────────────────────── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 } }}>

          {isAuthenticated ? (
            <>
              {/* 1 ── Theme toggle ─────────────────────────────────────────── */}
              {ThemeToggle}

              {/* 2 ── Dashboard ────────────────────────────────────────────── */}
              <Button
                variant="outlined"
                size="small"
                startIcon={<DashboardIcon />}
                onClick={() => onNavigate("dashboard")}
              >
                Dashboard
              </Button>

              {/* 3 ── User badge — dropdown trigger ────────────────────────── */}
              {/*
                Styled as a Neo-Brutalist stamp: thick INK border + offset
                shadow that collapses on press. The chevron icon signals it
                is a dropdown trigger per standard UX convention.
              */}
              <Box
                component="button"
                id="user-menu-button"
                aria-controls={menuOpen ? "user-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={menuOpen ? "true" : undefined}
                onClick={openMenu}
                sx={{
                  ...stampBase,
                  gap: "7px",
                  px: "10px",
                  py: "6px",
                  border: `2px solid ${INK}`,
                  boxShadow: `3px 3px 0px ${INK}`,
                  bgcolor: isDark ? "#333333" : "#F4F4F0",
                  color: isDark ? "#F0F0F0" : "#111111",
                  fontSize: "0.78rem",
                  // Rotate chevron when menu is open
                  "& .chevron": {
                    transition: "transform 0.15s ease",
                    transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                  },
                  "&:hover":  { transform: "translate(2px, 2px)", boxShadow: `1px 1px 0px ${INK}` },
                  "&:active": { transform: "translate(3px, 3px)", boxShadow: `0px 0px 0px ${INK}` },
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: "#FF5C28",
                    width: 22,
                    height: 22,
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {username[0]?.toUpperCase() ?? "U"}
                </Avatar>

                {/* Username hidden on xs to keep the bar compact */}
                <Box
                  component="span"
                  sx={{
                    display: { xs: "none", sm: "inline" },
                    maxWidth: 140,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {username}
                </Box>

                <KeyboardArrowDownIcon className="chevron" sx={{ fontSize: 16, ml: "-2px" }} />
              </Box>

              {/* ── Dropdown menu ──────────────────────────────────────────── */}
              {/*
                PaperProps applies Neo-Brutalism to the menu container itself:
                  • borderRadius: 0    (no rounding anywhere)
                  • thick INK border
                  • solid offset shadow — same token as every other card/paper
                mt: 0.75 creates a small visual gap between the badge and menu.
              */}
              <Menu
                id="user-menu"
                anchorEl={menuAnchor}
                open={menuOpen}
                onClose={closeMenu}
                MenuListProps={{ "aria-labelledby": "user-menu-button", disablePadding: true }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: 0,
                      border: `2px solid ${INK}`,
                      boxShadow: `5px 5px 0px ${INK}`,
                      bgcolor: "background.paper",
                      minWidth: 180,
                      mt: 0.75,
                      overflow: "visible",
                    },
                  },
                }}
              >
                {/* User info header */}
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.06em", color: "text.secondary", fontSize: "0.65rem" }}>
                    Signed in as
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="text.primary" noWrap sx={{ mt: 0.25 }}>
                    {user?.email}
                  </Typography>
                </Box>

                {/* Neo-Brutalist separator — solid 2px INK rule, no fade */}
                <Divider sx={{ borderBottomWidth: 2, borderColor: INK, mx: 0 }} />

                {/* Log Out — destructive, red ink */}
                {/*
                  Colour rule:
                    Dark  mode → #FF4D4D  (bright/vibrant red — readable on charcoal)
                    Light mode → #CC0000  (deep red — sufficient contrast on white)
                */}
                <MenuItem
                  onClick={() => { closeMenu(); logout(); onNavigate("home"); }}
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    py: 1.25,
                    px: 2,
                    color: isDark ? "#FF4D4D" : "#CC0000",
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderRadius: 0,
                    "&:hover": {
                      bgcolor: isDark ? "#2A0000" : "#FFF5F5",
                      color: isDark ? "#FF6B6B" : "#AA0000",
                    },
                  }}
                >
                  <LogoutIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                  <Typography
                    component="span"
                    sx={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1 }}
                  >
                    Log Out
                  </Typography>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              {/* Theme toggle available to unauthenticated visitors */}
              {ThemeToggle}

              <Button
                variant="text"
                size="small"
                onClick={() => onOpenAuth("login")}
                sx={{ color: "text.primary", fontWeight: 700 }}
              >
                Log In
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => onOpenAuth("register")}
                sx={{ px: 2.5 }}
              >
                Get Started
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
