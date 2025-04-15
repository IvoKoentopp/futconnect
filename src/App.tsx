import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Sales from "./pages/Sales";
import Settings from "./pages/Settings";
import AdminSettings from "./pages/AdminSettings";
import PlanConfig from "./pages/PlanConfig";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import NovoSocio from "./pages/NovoSocio";
import ListaSocios from "./pages/ListaSocios";
import MemberProfile from "./pages/MemberProfile";
import MemberStatistics from "./pages/MemberStatistics";
import Games from "./pages/Games";
import GamePanel from "./pages/GamePanel";
import GamePerformance from "./pages/GamePerformance";
import GameStatistics from "./pages/GameStatistics";
import GameHighlights from "./pages/GameHighlights";
import GameAbsenceAlerts from "./pages/GameAbsenceAlerts";
import Finances from "./pages/Finances";
import MonthlyFees from "./pages/MonthlyFees";
import CreateMonthlyFee from "./pages/CreateMonthlyFee";
import ClubDashboard from "./pages/ClubDashboard";
import ClubLogin from "./pages/ClubLogin";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import BankAccounts from "./pages/BankAccounts";
import MemberPortal from "./pages/MemberPortal";
import FinancialStatement from "./pages/FinancialStatement";
import GameConfirmation from "./pages/GameConfirmation";
import ConfirmationSuccess from "./pages/ConfirmationSuccess";
import Sponsors from "./pages/Sponsors";
import UserGuide from "./pages/UserGuide";
import { StatutePage } from "@/pages/club/documents/StatutePage";
import { AnthemPage } from "@/pages/club/documents/AnthemPage";
import { InvitationPage } from "@/pages/club/documents/InvitationPage";
import ClubChat from './pages/club/chat';
import DebugLogger from './components/DebugLogger';
import { SafeThemeProvider } from './components/SafeThemeProvider';

// Create a new QueryClient instance with more robust caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SafeThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/club-login" element={<ClubLogin />} />
              
              {/* Important: These routes MUST be public and outside of ProtectedRoute */}
              <Route path="/game-confirmation" element={<GameConfirmation />} />
              <Route path="/confirmation-success" element={<ConfirmationSuccess />} />
              
              {/* Member Portal Route */}
              <Route path="/member-portal" element={
                <ProtectedRoute>
                  <MemberPortal />
                </ProtectedRoute>
              } />
              
              {/* Sales Admin Routes - These use the sales admin navigation */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <AdminLayout appMode="sales">
                    <Dashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/customers" element={
                <ProtectedRoute>
                  <AdminLayout appMode="sales">
                    <Customers />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/sales" element={
                <ProtectedRoute>
                  <AdminLayout appMode="sales">
                    <Sales />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin-settings" element={
                <ProtectedRoute>
                  <AdminLayout appMode="sales">
                    <AdminSettings />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/plan-config" element={
                <ProtectedRoute>
                  <AdminLayout appMode="sales">
                    <PlanConfig />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              
              {/* User Guide Routes - Separate routes for club and sales modes */}
              <Route path="/user-guide" element={
                <ProtectedRoute>
                  <AdminLayout appMode="sales">
                    <UserGuide />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/club/user-guide" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <UserGuide />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              
              {/* Club Management Routes - These use the club management navigation */}
              <Route path="/club" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <ClubDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/club/documents/statute" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <StatutePage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/club/documents/anthem" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <AnthemPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/club/documents/invitation" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <InvitationPage />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/members/new" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <NovoSocio />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/members/list" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <ListaSocios />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/members/profile" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <MemberProfile />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/members/statistics" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <MemberStatistics />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/sponsors" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <Sponsors />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/games" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <Games />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/game-panel" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <GamePanel />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/game-statistics" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <GameStatistics />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/game-performance" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <GamePerformance />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/game-highlights" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <GameHighlights />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/game-absence-alerts" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <GameAbsenceAlerts />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/financial-statement" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <FinancialStatement />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/finances" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <Finances />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/chart-of-accounts" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <ChartOfAccounts />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/bank-accounts" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <BankAccounts />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <Settings />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/monthly-fees" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <MonthlyFees />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/monthly-fees/create" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <CreateMonthlyFee />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              
              {/* User Guide Route */}
              <Route path="/user-guide" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <UserGuide />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/club/chat" element={
                <ProtectedRoute>
                  <AdminLayout appMode="club">
                    <ClubChat />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </SafeThemeProvider>
    <DebugLogger />
  </QueryClientProvider>
);

export default App;
