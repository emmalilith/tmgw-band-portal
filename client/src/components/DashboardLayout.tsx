import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const mainMenuItems = [
  { icon: LayoutDashboard, label: "ダッシュボード", path: "/", emoji: "🏠" },
  { icon: Bell, label: "連絡事項", path: "/announcements", emoji: "📢" },
  { icon: CalendarRange, label: "月間スケジュール", path: "/schedule/monthly", emoji: "📅" },
  { icon: CalendarDays, label: "週間スケジュール", path: "/schedule/weekly", emoji: "🗓️" },
  { icon: GraduationCap, label: "レッスン講師", path: "/lessons", emoji: "🎓" },
  { icon: Star, label: "演奏会カウントダウン", path: "/events", emoji: "🎺" },
  { icon: Music2, label: "本日の練習", path: "/practice", emoji: "🎵" },
  { icon: BookOpen, label: "遅刻・欠席申請", path: "/absence", emoji: "📝" },
];

const adminMenuItems = [
  { icon: Users, label: "メンバー管理", path: "/admin/users", emoji: "👥" },
  { icon: Settings, label: "申請承認", path: "/admin/approvals", emoji: "✅" },
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

function getRoleBadgeStyle(role?: string) {
  if (role === "admin") return "bg-orange-400/30 text-orange-200 border-orange-400/40";
  if (role === "section_leader") return "bg-sky-400/30 text-sky-200 border-sky-400/40";
  return "bg-white/20 text-white/80 border-white/30";
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center gap-8 p-10 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl">
              <span className="text-4xl">🎺</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white text-center drop-shadow-lg">
              TMGW Brass Band
            </h1>
            <p className="text-sm text-white/80 text-center leading-relaxed">
              部員専用ポータルへようこそ！<br />ログインして練習を始めよう 🎵
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full bg-white text-violet-700 hover:bg-white/90 font-bold shadow-xl text-base rounded-xl"
          >
            <Sparkles className="w-4 h-4 mr-2" />
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

  const isAdmin = user?.role === "admin";
  const isLeaderOrAdmin = user?.role === "admin" || user?.role === "section_leader";

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

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
          style={{
            background: "linear-gradient(180deg, oklch(0.38 0.2 290) 0%, oklch(0.32 0.22 300) 50%, oklch(0.28 0.2 310) 100%)",
          }}
        >
          {/* Header */}
          <SidebarHeader className="h-16 justify-center border-b border-white/10">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-white/15 rounded-xl transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-white/70" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">🎺</span>
                  <span className="font-bold text-white truncate text-sm tracking-wide">
                    TMGW Brass Band
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Main Nav */}
          <SidebarContent className="gap-0 py-3">
            <SidebarGroup>
              {!isCollapsed && (
                <SidebarGroupLabel className="text-xs text-white/40 uppercase tracking-widest px-4 mb-1 font-bold">
                  メニュー
                </SidebarGroupLabel>
              )}
              <SidebarMenu className="px-2 gap-0.5">
                {mainMenuItems.map(item => {
                  const isActive = location === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className={`h-10 transition-all rounded-xl font-semibold text-sm
                          ${isActive
                            ? "bg-white/20 text-white shadow-sm"
                            : "text-white/70 hover:text-white hover:bg-white/10"
                          }`}
                      >
                        <span className="text-base w-5 text-center shrink-0">{item.emoji}</span>
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>

            {/* Admin / Leader section */}
            {isLeaderOrAdmin && (
              <SidebarGroup className="mt-3">
                {!isCollapsed && (
                  <SidebarGroupLabel className="text-xs text-white/40 uppercase tracking-widest px-4 mb-1 font-bold">
                    管理
                  </SidebarGroupLabel>
                )}
                <SidebarMenu className="px-2 gap-0.5">
                  {adminMenuItems.map(item => {
                    if (item.path === "/admin/users" && !isAdmin) return null;
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-10 transition-all rounded-xl font-semibold text-sm
                            ${isActive
                              ? "bg-white/20 text-white shadow-sm"
                              : "text-white/70 hover:text-white hover:bg-white/10"
                            }`}
                        >
                          <span className="text-base w-5 text-center shrink-0">{item.emoji}</span>
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            )}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-white/10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/10 transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0 border-2 border-white/30">
                    <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-orange-400 to-pink-500 text-white">
                      {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-white leading-none">
                        {user?.name ?? "-"}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md border mt-1 inline-block font-semibold ${getRoleBadgeStyle(user?.role)}`}>
                        {getRoleLabel(user?.role)}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive rounded-lg">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>ログアウト</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-violet-400/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-xl" />
              <span className="font-bold text-sm">{activeItem?.label ?? "メニュー"}</span>
            </div>
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
