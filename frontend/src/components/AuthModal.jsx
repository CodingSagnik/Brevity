import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  InputAdornment,
  IconButton,
  Divider,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LinkIcon from "@mui/icons-material/Link";
import { useAuth } from "../context/AuthContext";

import { API_BASE } from "../config/api";

const INITIAL_FORM = { email: "", password: "", confirmPassword: "" };

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2.5 }}>{children}</Box> : null;
}

/**
 * Auth dialog — Neo-Brutalist styling.
 *
 * The soft gradient accent bar and rounded corners are replaced by a solid
 * primary-coloured top strip and a heavy black-bordered dialog box (handled
 * by the MuiDialog theme override). Every input and button inherits the
 * global neo-brutalist theme — no local overrides needed.
 */
export default function AuthModal({ open, onClose, initialTab = 0 }) {
  const { login } = useAuth();

  const [tab, setTab]           = useState(initialTab);
  const [form, setForm]         = useState(INITIAL_FORM);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleEntered = () => {
    setTab(initialTab);
    setForm(INITIAL_FORM);
    setError("");
  };

  const handleTabChange = (_e, newTab) => {
    setTab(newTab);
    setForm(INITIAL_FORM);
    setError("");
    setShowPass(false);
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tab === 1 && form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const endpoint = tab === 0 ? "/auth/login" : "/auth/register";
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      login(data.token, data.user);
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const passwordField = (
    <TextField
      fullWidth
      label="Password"
      type={showPass ? "text" : "password"}
      value={form.password}
      onChange={handleChange("password")}
      required
      autoComplete={tab === 0 ? "current-password" : "new-password"}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={() => setShowPass((p) => !p)}
              edge="end"
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ onEntered: handleEntered }}
    >
      {/* Solid primary accent strip — replaces the old gradient bar */}
      <Box sx={{ height: 6, bgcolor: "primary.main" }} />

      <DialogTitle sx={{ pb: 0, pt: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              bgcolor: "#111111",
            }}
          >
            <LinkIcon sx={{ color: "#FF5C28", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {tab === 0 ? "Welcome back" : "Create account"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Brevity
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Sign In" disableRipple />
          <Tab label="Register" disableRipple />
        </Tabs>

        {/* ── Login form ────────────────────────────────────────────────────── */}
        <TabPanel value={tab} index={0}>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth label="Email" type="email"
                value={form.email} onChange={handleChange("email")}
                required autoComplete="email" autoFocus
              />
              {passwordField}

              {error && <Alert severity="error">{error}</Alert>}

              <Button
                type="submit" fullWidth variant="contained" size="large"
                disabled={loading || !form.email || !form.password}
                sx={{ py: 1.4, mt: 0.5 }}
              >
                {loading ? <CircularProgress size={22} thickness={5} color="inherit" /> : "Sign In"}
              </Button>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="body2" align="center" color="text.secondary">
              No account yet?{" "}
              <Typography
                component="span" variant="body2" color="primary" fontWeight={700}
                sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                onClick={() => handleTabChange(null, 1)}
              >
                Create one free →
              </Typography>
            </Typography>
          </Box>
        </TabPanel>

        {/* ── Register form ─────────────────────────────────────────────────── */}
        <TabPanel value={tab} index={1}>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                fullWidth label="Email" type="email"
                value={form.email} onChange={handleChange("email")}
                required autoComplete="email" autoFocus
              />
              {passwordField}
              <TextField
                fullWidth label="Confirm Password"
                type={showPass ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                required autoComplete="new-password"
                error={Boolean(form.confirmPassword) && form.password !== form.confirmPassword}
                helperText={
                  Boolean(form.confirmPassword) && form.password !== form.confirmPassword
                    ? "Passwords do not match"
                    : " "
                }
              />

              {error && <Alert severity="error">{error}</Alert>}

              <Button
                type="submit" fullWidth variant="contained" size="large"
                disabled={loading || !form.email || !form.password || !form.confirmPassword}
                sx={{ py: 1.4, mt: 0.5 }}
              >
                {loading ? <CircularProgress size={22} thickness={5} color="inherit" /> : "Create Account"}
              </Button>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="body2" align="center" color="text.secondary">
              Already have an account?{" "}
              <Typography
                component="span" variant="body2" color="primary" fontWeight={700}
                sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                onClick={() => handleTabChange(null, 0)}
              >
                Sign in →
              </Typography>
            </Typography>
          </Box>
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
}
