import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Chip,
  Link,
  IconButton,
  Tooltip,
  Button,
  Alert,
  Toolbar,
  useTheme,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import BarChartIcon from "@mui/icons-material/BarChart";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import InboxIcon from "@mui/icons-material/Inbox";

import { useAuth } from "../context/AuthContext";

import { API_BASE } from "../config/api";
const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));

const formatNumber = (n) =>
  new Intl.NumberFormat("en-US").format(n ?? 0);

// ─── StatCard ─────────────────────────────────────────────────────────────────
//
// Card backgrounds switch between bright pastels (light mode) and deep tinted
// darks (dark mode) while the border/shadow INK inverts with the theme.
//
//   Light mode pastels      Dark mode equivalents
//   ─────────────────────   ─────────────────────
//   Retro pink  #FFD6E7  →  Deep wine   #3D0B24
//   Mint green  #C7F2C0  →  Dark forest #0D3B1A
//   Pale blue   #BDE0FE  →  Dark navy   #0A2440

function StatCard({ icon, label, value, accentColor, lightBg, darkBg, loading }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const INK = isDark ? "#FFFFFF" : "#111111";
  const bgColor = isDark ? darkBg : lightBg;

  return (
    <Card
      elevation={0}
      sx={{ height: "100%", overflow: "hidden", position: "relative", bgcolor: bgColor }}
    >
      {/* Full-height left accent strip */}
      <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, bgcolor: accentColor }} />

      <CardContent sx={{ pl: 3.5, py: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Typography
              variant="caption"
              fontWeight={700}
              letterSpacing={1}
              sx={{ textTransform: "uppercase", fontSize: "0.68rem", color: "text.secondary" }}
            >
              {label}
            </Typography>

            {loading ? (
              <Skeleton variant="text" width={80} height={52} sx={{ mt: 0.5 }} />
            ) : (
              <Typography
                variant="h4"
                fontWeight={800}
                sx={{ mt: 0.5, color: "text.primary", letterSpacing: "-0.03em", lineHeight: 1.1 }}
              >
                {value}
              </Typography>
            )}
          </Box>

          {/* Solid accent badge — border/shadow use INK for the active mode */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 46,
              height: 46,
              bgcolor: accentColor,
              border: `2px solid ${INK}`,
              boxShadow: `3px 3px 0px ${INK}`,
              flexShrink: 0,
              mt: 0.5,
            }}
          >
            {loading
              ? <Skeleton variant="rectangular" width={24} height={24} />
              : <Box sx={{ color: "#FFFFFF", display: "flex" }}>{icon}</Box>
            }
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── CopyButton ───────────────────────────────────────────────────────────────
//
// A stamp-style blocky mini button. Uses INK (white in dark mode, black in
// light) so the border and shadow always contrast against the page surface.

function CopyButton({ text }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const INK = isDark ? "#FFFFFF" : "#111111";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      component="button"
      onClick={handleCopy}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        px: "6px",
        py: "3px",
        border:     copied ? "1.5px solid #16a34a" : `1.5px solid ${INK}`,
        boxShadow:  copied ? "2px 2px 0px #16a34a" : `2px 2px 0px ${INK}`,
        bgcolor:    copied ? (isDark ? "#052E16" : "#DCFCE7") : (isDark ? "#2A2A2A" : "#FFFFFF"),
        cursor: "pointer",
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: "0.62rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color:     copied ? "#16a34a" : (isDark ? "#F0F0F0" : "#111111"),
        transition: "transform 0.1s, box-shadow 0.1s",
        "&:hover": {
          transform:  "translate(1px, 1px)",
          boxShadow:  copied ? "1px 1px 0px #16a34a" : `1px 1px 0px ${INK}`,
        },
        lineHeight: 1,
        outline: "none",
      }}
    >
      {copied
        ? <CheckCircleOutlineIcon sx={{ fontSize: 11 }} />
        : <ContentCopyIcon sx={{ fontSize: 11 }} />
      }
      {copied ? "Copied" : "Copy"}
    </Box>
  );
}

// ─── SkeletonRows ─────────────────────────────────────────────────────────────

function SkeletonRows({ count = PAGE_SIZE }) {
  return Array.from({ length: count }).map((_, i) => (
    <TableRow key={i}>
      <TableCell><Skeleton variant="text" width="80%" /></TableCell>
      <TableCell><Skeleton variant="text" width={100} /></TableCell>
      <TableCell align="center"><Skeleton variant="rectangular" width={40} height={22} sx={{ mx: "auto" }} /></TableCell>
      <TableCell><Skeleton variant="text" width={90} /></TableCell>
    </TableRow>
  ));
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({ onNavigateHome }) {
  const { token, logout } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const INK = isDark ? "#FFFFFF" : "#111111";

  const [stats, setStats]           = useState(null);
  const [rows, setRows]             = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard/stats`, { headers }),
        fetch(`${API_BASE}/dashboard/history?page=${page}&limit=${PAGE_SIZE}`, { headers }),
      ]);

      if (statsRes.status === 401 || historyRes.status === 401) {
        logout();
        onNavigateHome();
        return;
      }

      if (!statsRes.ok || !historyRes.ok) {
        throw new Error("Failed to load dashboard data. Please try again.");
      }

      const [statsData, historyData] = await Promise.all([
        statsRes.json(),
        historyRes.json(),
      ]);

      setStats(statsData);
      setRows(historyData.data);
      setPagination(historyData.pagination);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [token, page, logout, onNavigateHome]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <Toolbar />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, flex: 1 }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            gap: 2,
            mb: 4,
          }}
        >
          <Box>
            <Button
              startIcon={<ArrowBackIcon />}
              variant="text"
              size="small"
              onClick={onNavigateHome}
              sx={{ color: "text.secondary", mb: 1, pl: 0 }}
            >
              Back to Home
            </Button>
            <Typography variant="h4" component="h1">
              My Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              Your link performance at a glance.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchDashboard}
            disabled={loading}
            size="small"
            sx={{
              alignSelf: { xs: "flex-start", sm: "center" },
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
            Refresh
          </Button>
        </Box>

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {error && (
          <Alert
            severity="error"
            action={<Button size="small" onClick={fetchDashboard}>Retry</Button>}
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Retro pink — Total Links */}
          <Grid item xs={12} sm={4}>
            <StatCard
              label="Total Links"
              value={formatNumber(stats?.totalUrls)}
              icon={<LinkIcon />}
              lightBg="#FFD6E7"
              darkBg="#3D0B24"
              accentColor="#F72585"
              loading={loading}
            />
          </Grid>
          {/* Mint green — Total Clicks */}
          <Grid item xs={12} sm={4}>
            <StatCard
              label="Total Clicks"
              value={formatNumber(stats?.totalClicks)}
              icon={<TouchAppIcon />}
              lightBg="#C7F2C0"
              darkBg="#0D3B1A"
              accentColor="#2DC653"
              loading={loading}
            />
          </Grid>
          {/* Pale blue — Avg Clicks */}
          <Grid item xs={12} sm={4}>
            <StatCard
              label="Avg. Clicks / Link"
              value={stats?.avgClicksPerUrl ?? "—"}
              icon={<BarChartIcon />}
              lightBg="#BDE0FE"
              darkBg="#0A2440"
              accentColor="#1D7FE8"
              loading={loading}
            />
          </Grid>
        </Grid>

        {/* ── History table ─────────────────────────────────────────────────── */}
        <Paper elevation={0}>
          {/* Table header row */}
          <Box
            sx={{
              px: 3,
              py: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `3px solid ${INK}`,
            }}
          >
            <Typography variant="h6" sx={{ fontSize: "1rem" }}>
              Link History
            </Typography>
            {pagination && (
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {formatNumber(pagination.total)} link{pagination.total !== 1 ? "s" : ""} total
              </Typography>
            )}
          </Box>

          {/* TableContainer is nested inside a Paper — remove its inherited border */}
          <TableContainer sx={{ border: "none", boxShadow: "none" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Original URL</TableCell>
                  <TableCell>Short URL</TableCell>
                  <TableCell align="center">Clicks</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <SkeletonRows count={PAGE_SIZE} />
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Box
                        sx={{
                          textAlign: "center",
                          py: 8,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <InboxIcon sx={{ fontSize: 48, color: "text.disabled" }} />
                        <Typography variant="body1" fontWeight={700} color="text.secondary">
                          No links yet
                        </Typography>
                        <Typography variant="body2" color="text.disabled">
                          Shorten your first URL from the home page.
                        </Typography>
                        <Button variant="contained" size="small" onClick={onNavigateHome} sx={{ mt: 1 }}>
                          Shorten a URL
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.shortId} hover>
                      {/* ── Original URL ────────────────────────────────────── */}
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Tooltip title={row.originalUrl} arrow placement="top-start">
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "text.primary",
                              fontWeight: 500,
                            }}
                          >
                            {row.originalUrl}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      {/* ── Short URL ───────────────────────────────────────── */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Link
                            href={row.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              color: "primary.main",
                              textDecoration: "none",
                              fontFamily: "monospace",
                              "&:hover": { textDecoration: "underline" },
                            }}
                          >
                            {row.shortId}
                          </Link>
                          <Tooltip title="Open" arrow>
                            <IconButton
                              size="small"
                              component="a"
                              href={row.shortUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: "text.disabled", p: 0.5, "&:hover": { color: "primary.main" } }}
                            >
                              <OpenInNewIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                          <CopyButton text={row.shortUrl} />
                        </Box>
                      </TableCell>

                      {/* ── Clicks ──────────────────────────────────────────── */}
                      <TableCell align="center">
                        <Chip
                          label={formatNumber(row.clickCount)}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            bgcolor: row.clickCount > 0 ? "#FF5C28" : "#EEEEEE",
                            color: row.clickCount > 0 ? "#FFFFFF" : "#555555",
                            border: row.clickCount > 0 ? `1.5px solid ${INK}` : `1.5px solid ${isDark ? "#555555" : "#CCCCCC"}`,
                            minWidth: 36,
                          }}
                        />
                      </TableCell>

                      {/* ── Date ────────────────────────────────────────────── */}
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.83rem", fontWeight: 500 }}>
                          {formatDate(row.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ── Pagination controls ───────────────────────────────────────── */}
          {pagination && pagination.totalPages > 1 && (
            <>
              {/* Thick black rule — replaces the soft MUI Divider */}
              <Box sx={{ borderTop: `3px solid ${INK}` }} />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 3,
                  py: 1.5,
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Page {pagination.page} of {pagination.totalPages}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ChevronLeftIcon />}
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                    sx={{ minWidth: 0, px: 1.5 }}
                  >
                    Prev
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    endIcon={<ChevronRightIcon />}
                    disabled={!pagination.hasNextPage || loading}
                    onClick={() => setPage((p) => p + 1)}
                    sx={{ minWidth: 0, px: 1.5 }}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
