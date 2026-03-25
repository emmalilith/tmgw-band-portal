import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Announcements from "./pages/Announcements";
import MonthlySchedule from "./pages/MonthlySchedule";
import WeeklySchedule from "./pages/WeeklySchedule";
import LessonVisits from "./pages/LessonVisits";
import Events from "./pages/Events";
import Practice from "./pages/Practice";
import Absence from "./pages/Absence";
import AdminUsers from "./pages/AdminUsers";
import AdminApprovals from "./pages/AdminApprovals";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/announcements" component={Announcements} />
        <Route path="/schedule/monthly" component={MonthlySchedule} />
        <Route path="/schedule/weekly" component={WeeklySchedule} />
        <Route path="/lessons" component={LessonVisits} />
        <Route path="/events" component={Events} />
        <Route path="/practice" component={Practice} />
        <Route path="/absence" component={Absence} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/approvals" component={AdminApprovals} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
