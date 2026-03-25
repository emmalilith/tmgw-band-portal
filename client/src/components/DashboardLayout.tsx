import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Bell,
  BookOpen,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Music2,
  PanelLeft,
  Settings,
  Star,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";

const mainMenuItems = [
  { icon: LayoutDashboard, label: "ダッシュボード", path: "/" },
  { icon: Bell, label: "連絡事項", path: "/announcements" },
  { icon: CalendarRange, label: "月間スケジュール", path: "/schedule/monthly" },
  { icon: CalendarDays, label: "週間スケジュール", path: "/schedule/weekly" },
  { icon: GraduationCap, label: "レッスン講師", path: "/lessons" },
  { icon: Star, label: "演奏会カウントダウン", path: "/events" },
  { icon: Music2, label: "本日の練習", path: "/practice" },
  { icon: BookOpen, label: "遅刻・欠席申請", path: "/absence" },
];

const adminMenuItems = [
  { icon: Users, label: "メンバー管理", path: "/admin/users" },
  { icon: Settings, label: "申請承認", path: "/admin/approvals" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

function getRoleLabel(role?: string) {
  if (role === "admin") return "顧問";
  if (role === "section_leader") return "パートリーダー";
  return "部員";
}

function getRoleBadgeColor(role?: string) {
  if (role === "admin") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  if (role === "section_leader") return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  return "bg-slate-500/20 text-slate-300 border-slate-500/30";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="flex flex-col items-center gap-8 p-10 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Music2 className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-3xl font-serif font-light tracking-wide text-white text-center">
              吹奏楽部ポータル
            </h1>
            <p className="text-sm text-slate-400 text-center leading-relaxed">
              部員専用のポータルサイトです。<br />ログインして続けてください。
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium shadow-lg"
          >
            ログイン
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const activeItem = [...mainMenuItems, ...adminMenuItems].find(i => i.path === location);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const w = e.clientX - left;
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) setSidebarWidth(w);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const isAdmin = user?.role === "admin";
  const isLeaderOrAdmin = user?.role === "admin" || user?.role === "section_leader";

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border/50">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <Music2 className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-serif font-medium text-sidebar-foreground truncate text-sm tracking-wide">
                    TMGW Brass Band Portal
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Main Nav */}
          <SidebarContent className="gap-0 py-2">
            <SidebarGroup>
              {!isCollapsed && (
                <SidebarGroupLabel className="text-xs text-sidebar-foreground/40 uppercase tracking-widest px-4 mb-1">
                  メニュー
                </SidebarGroupLabel>
              )}
              <SidebarMenu className="px-2">
                {mainMenuItems.map(item => {
                  const isActive = location === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className="h-9 transition-all font-normal text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      >
                        <item.icon className={`h-4 w-4 ${isActive ? "text-amber-400" : ""}`} />
                        <span className="text-sm">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>

            {/* Admin / Leader section */}
            {isLeaderOrAdmin && (
              <SidebarGroup className="mt-2">
                {!isCollapsed && (
                  <SidebarGroupLabel className="text-xs text-sidebar-foreground/40 uppercase tracking-widest px-4 mb-1">
                    管理
                  </SidebarGroupLabel>
                )}
                <SidebarMenu className="px-2">
                  {adminMenuItems.map(item => {
                    if (item.path === "/admin/users" && !isAdmin) return null;
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-9 transition-all font-normal text-sidebar-foreground/80 hover:text-sidebar-foreground"
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? "text-amber-400" : ""}`} />
                          <span className="text-sm">{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            )}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-sidebar-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border">
                    <AvatarFallback className="text-xs font-medium bg-amber-500/20 text-amber-300">
                      {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-sidebar-foreground leading-none">
                        {user?.name ?? "-"}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded border mt-1 inline-block ${getRoleBadgeColor(user?.role)}`}>
                        {getRoleLabel(user?.role)}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>ログアウト</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-amber-400/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="font-medium text-sm">{activeItem?.label ?? "メニュー"}</span>
            </div>
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
