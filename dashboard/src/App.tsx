import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, CssBaseline, Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { UserManagement } from './components/UserManagement';
import { DatabaseViewer } from './components/DatabaseViewer';
import { MachineDetailRoute } from './components/MachineDetailRoute';
import { Sidebar, TopBar } from './components';

// Main Layout Component with Sidebar
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const { sidebarOpen } = useUI();
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <Sidebar />
      <Box
        sx={{
          flexGrow: 1,
          // 64px = collapsed icon-only sidebar width; 0 when sidebar is fully hidden
          ml: sidebarOpen ? '64px' : 0,
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.3s ease',
        }}
      >
        <TopBar />
        <Box component="main" sx={{ p: 2, flexGrow: 1, backgroundColor: theme.palette.background.default }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

// Dashboard Router (handles role-based routing)
const DashboardRouter: React.FC = () => {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route based on role
  if (isAdmin) {
    return <AdminDashboard />;
  } else {
    return <UserDashboard />;
  }
};

function App() {
  return (
    <ThemeProvider>
      <ThemeWrapper />
    </ThemeProvider>
  );
}

// Wrapper component to access theme from context
const ThemeWrapper: React.FC = () => {
  const { theme } = useTheme();

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <UIProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <DashboardRouter />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/machine/:machineId"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <MachineDetailRoute />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <Layout>
                        <UserManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/database"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <DatabaseViewer />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </UIProvider>
        </NotificationProvider>
      </AuthProvider>
    </MuiThemeProvider>
  );
};

export default App;
