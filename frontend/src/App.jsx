import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
  Link,
  Divider,
  Chip,
  Fade,
  Toolbar,
  useTheme,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LinkIcon from "@mui/icons-material/Link";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import Dashboard from "./components/Dashboard";

// Theme and CssBaseline now live in ThemeContext → ThemeModeProvider.
// App.jsx is a pure presentation tree; it reads the active theme via
// useTheme() wherever it needs to branch on light vs dark.

const API_BASE = "/api";

// ─── ResultCard ───────────────────────────────────────────────────────────────

function ResultCard({ result }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const INK = isDark ? "#FFFFFF" : "#111111";

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement("textarea");
      el.value = result.shortUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Fade in timeout={400}>
      <Card elevation={0} sx={{ mt: 3, overflow: "hidden" }}>
        {/* Solid primary accent strip */}
        <Box sx={{ height: 6, bgcolor: "primary.main" }} />

        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CheckCircleOutlineIcon sx={{ color: "success.main", fontSize: 20 }} />
              <Typography variant="body2" fontWeight={700} color="success.main">
                Your short link is ready!
              </Typography>
            </Box>
            {result.owner && (
              <Tooltip title="Saved to your account — visible in your dashboard">
                <Chip
                  icon={<AccountCircleIcon sx={{ fontSize: "14px !important" }} />}
                  label="Saved"
                  size="small"
                  color="primary"
                  sx={{ fontSize: "0.7rem", height: 24 }}
                />
              </Tooltip>
            )}
          </Box>

          {/* Short URL display — uses theme background so it recesses slightly */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 1.5,
              bgcolor: "background.default",
              border: `2px solid ${INK}`,
              mb: 2.5,
            }}
          >
            <LinkIcon sx={{ color: "primary.main", fontSize: 18, flexShrink: 0 }} />
            <Link
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                flex: 1,
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "primary.main",
                textDecoration: "none",
                wordBreak: "break-all",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {result.shortUrl}
            </Link>
            <Tooltip title={copied ? "Copied!" : "Copy to clipboard"} arrow>
              <IconButton
                onClick={handleCopy}
                size="small"
                sx={{ color: copied ? "success.main" : "text.secondary", flexShrink: 0, transition: "color 0.2s" }}
              >
                {copied ? <CheckCircleOutlineIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mb: 2.5 }}
          >
            Original:&nbsp;
            <span style={{ color: isDark ? "#666666" : "#888888" }}>{result.originalUrl}</span>
          </Typography>

          <Divider sx={{ mb: 2.5 }} />

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="contained"
              onClick={handleCopy}
              startIcon={
                copied
                  ? <CheckCircleOutlineIcon sx={{ fontSize: "1rem !important" }} />
                  : <ContentCopyIcon sx={{ fontSize: "1rem !important" }} />
              }
              color={copied ? "success" : "primary"}
              sx={{ flex: 1 }}
            >
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              variant="outlined"
              component="a"
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon sx={{ fontSize: "1rem !important" }} />}
              sx={{ flex: 1 }}
            >
              Open Link
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Fade>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { token, isAuthenticated } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const INK = isDark ? "#FFFFFF" : "#111111";

  const [view, setView] = useState("home");
  const navigateTo   = (v) => setView(v);
  const navigateHome = () => setView("home");

  const [inputUrl, setInputUrl] = useState("");
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab]   = useState(0);

  const openAuth = (tab) => {
    setAuthTab(tab === "register" ? 1 : 0);
    setAuthOpen(true);
  };

  const handleShorten = async (e) => {
    e.preventDefault();
    const trimmed = inputUrl.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setResult(null);

    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/shorten`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setResult(data);
      setInputUrl("");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialTab={authTab} />
      <Navbar onOpenAuth={openAuth} onNavigate={navigateTo} />

      {/* ── Dashboard view ───────────────────────────────────────────────────── */}
      {view === "dashboard" && isAuthenticated && (
        <Dashboard onNavigateHome={navigateHome} />
      )}

      {/* ── Home view ────────────────────────────────────────────────────────── */}
      {view === "home" && (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
          <Toolbar />

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              pt: { xs: 5, md: 8 },
              pb: 8,
              px: 2,
            }}
          >
            <Container maxWidth="sm" disableGutters>

              {/* ── Hero ─────────────────────────────────────────────────────── */}
              <Box sx={{ textAlign: "center", mb: 5 }}>
                {/*
                  Dark mode: orange box + white shadow  →  pops on charcoal
                  Light mode: black box  + orange shadow →  classic ink-on-paper
                */}
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 64,
                    height: 64,
                    bgcolor:   isDark ? "#FF5C28" : "#111111",
                    border:    `3px solid ${INK}`,
                    boxShadow: isDark ? "5px 5px 0px #FFFFFF" : "5px 5px 0px #FF5C28",
                    mb: 3,
                  }}
                >
                  <LinkIcon sx={{ color: isDark ? "#FFFFFF" : "#FF5C28", fontSize: 32 }} />
                </Box>

                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
                  Brevity
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {isAuthenticated
                    ? "Shorten a URL — it will be saved to your account."
                    : "Short links. No fluff."}
                </Typography>
              </Box>

              {/* ── Form card ────────────────────────────────────────────────── */}
              <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 } }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2.5 }}>
                  Shorten a URL
                </Typography>

                <Box component="form" onSubmit={handleShorten} noValidate>
                  <TextField
                    fullWidth
                    label="Long URL"
                    placeholder="https://example.com/very/long/path"
                    value={inputUrl}
                    onChange={(e) => { setInputUrl(e.target.value); if (error) setError(""); }}
                    error={Boolean(error)}
                    helperText={
                      error ? (
                        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <ErrorOutlineIcon sx={{ fontSize: 14 }} />
                          {error}
                        </Box>
                      ) : " "
                    }
                    disabled={loading}
                    autoComplete="off"
                    autoFocus
                    sx={{ mb: 2 }}
                  />

                  {/* Neon-yellow submit — stark contrast in both modes */}
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading || !inputUrl.trim()}
                    sx={{
                      py: 1.6,
                      fontSize: "0.9rem",
                      bgcolor: "#FFE500",
                      color: "#111111",
                      "&:hover": { bgcolor: "#FFD700", color: "#111111" },
                      "&.Mui-disabled": {
                        bgcolor: isDark ? "#3A3700" : "#F0E88A",
                        color: isDark ? "#666600" : "#888888",
                        border: `2px solid ${isDark ? "#555500" : "#AAAAAA"}`,
                        boxShadow: `4px 4px 0px ${isDark ? "#555500" : "#AAAAAA"}`,
                      },
                    }}
                  >
                    {loading
                      ? <CircularProgress size={22} thickness={5} color="inherit" />
                      : "Shorten URL"}
                  </Button>
                </Box>

                {!isAuthenticated && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2.5, textAlign: "center" }}>
                    <Typography
                      component="span"
                      variant="caption"
                      color="primary"
                      fontWeight={700}
                      sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                      onClick={() => openAuth("register")}
                    >
                      Create a free account
                    </Typography>
                    {" "}to track clicks and manage your links.
                  </Typography>
                )}
              </Paper>

              {result && <ResultCard result={result} />}

              <Box sx={{ mt: 6, textAlign: "center" }}>
                <Chip
                  label="Node · Express · MongoDB · Redis"
                  size="small"
                  sx={{ color: "text.secondary", fontSize: "0.7rem" }}
                />
              </Box>
            </Container>
          </Box>
        </Box>
      )}
    </>
  );
}
