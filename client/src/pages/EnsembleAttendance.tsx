import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Music2,
  AlertCircle,
  Clock,
  LogOut,
  CalendarDays,
  UserX,
  CheckCircle2,
} from "lucide-react";
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { ja } from "date-fns/locale";
import { useLocation } from "wouter";

const TYPE_CONFIG = {
  absence: {
    label: "欠席",
    icon: UserX,
    color: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  late: {
    label: "遅刻",
    icon: Clock,
    color: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  early_leave: {
    label: "早退",
    icon: LogOut,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
} as const;

function AttendanceMember({
  name,
  part,
  requestType,
  arrivalTime,
  leaveTime,
  reason,
}: {
  name: string | null;
  part: string | null;
  requestType: "absence" | "late" | "early_leave";
  arrivalTime: string | null | undefined;
  leaveTime: string | null | undefined;
  reason: string;
}) {
  const cfg = TYPE_CONFIG[requestType];
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.color}`}>
      <div className={`mt-0.5 p-1.5 rounded-lg bg-white/60`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm">{name ?? "不明"}</span>
          {part && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 font-medium">{part}</span>
          )}
          <span className="text-xs font-semibold">{cfg.label}</span>
        </div>
        {requestType === "late" && arrivalTime && (
          <p className="text-xs mt-0.5 opacity-80">到着予定: {arrivalTime}</p>
        )}
        {requestType === "early_leave" && leaveTime && (
          <p className="text-xs mt-0.5 opacity-80">退出予定: {leaveTime}</p>
        )}
        <p className="text-xs mt-1 opacity-70 line-clamp-2">{reason}</p>
      </div>
    </div>
  );
}

export default function EnsembleAttendance() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );

  const yearMonth = useMemo(() => selectedDate.slice(0, 7), [selectedDate]);

  const { data: attendanceData, isLoading, isError, error } = trpc.ensembleAttendance.byDate.useQuery(
    { date: selectedDate },
    { enabled: !!selectedDate }
  );

  const { data: ensembleDates } = trpc.ensembleAttendance.datesInMonth.useQuery(
    { yearMonth },
    { enabled: !!yearMonth }
  );

  // Build calendar for current month
  const monthStart = useMemo(() => startOfMonth(new Date(selectedDate + "T00:00:00")), [selectedDate]);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);
  const daysInMonth = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  const ensembleDateSet = useMemo(() => new Set(ensembleDates ?? []), [ensembleDates]);

  const absences = attendanceData?.absences ?? [];
  const practice = attendanceData?.practice ?? null;

  const grouped = useMemo(() => {
    const map: Record<string, typeof absences> = { absence: [], late: [], early_leave: [] };
    for (const a of absences) {
      map[a.requestType]?.push(a);
    }
    return map;
  }, [absences]);

  const prevMonth = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setMonth(d.getMonth() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };
  const nextMonth = () => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setMonth(d.getMonth() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  const firstDayOfWeek = getDay(monthStart);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">合奏出欠ボード</h1>
          <p className="text-sm text-muted-foreground">合奏練習日の欠席・遅刻・早退者一覧</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar picker */}
        <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-violet-600 to-purple-700 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="text-white hover:bg-white/20 h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-bold text-sm">
                {format(monthStart, "yyyy年M月", { locale: ja })}
              </span>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="text-white hover:bg-white/20 h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {weekDays.map((d, i) => (
                <div
                  key={d}
                  className={`text-center text-xs font-bold py-1 ${
                    i === 0 ? "text-red-300" : i === 6 ? "text-blue-300" : "text-white/70"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {daysInMonth.map((day) => {
                const dateStr = day.toISOString().split("T")[0];
                const isSelected = dateStr === selectedDate;
                const isEnsemble = ensembleDateSet.has(dateStr);
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                const dow = getDay(day);

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      relative text-center text-xs py-1.5 rounded-lg font-medium transition-all
                      ${isSelected ? "bg-white text-purple-700 font-black shadow-md" : "hover:bg-white/20"}
                      ${isToday && !isSelected ? "ring-1 ring-white/60" : ""}
                      ${dow === 0 ? "text-red-300" : dow === 6 ? "text-blue-300" : "text-white"}
                    `}
                  >
                    {format(day, "d")}
                    {isEnsemble && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              合奏練習日
            </div>
          </CardContent>
        </Card>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Selected date header */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="font-black text-lg text-foreground">
                    {format(new Date(selectedDate + "T00:00:00"), "M月d日（E）", { locale: ja })}
                  </p>
                  {practice ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <Music2 className="h-3.5 w-3.5 text-violet-500" />
                      <span className="text-sm text-muted-foreground">
                        合奏練習
                        {practice.startTime && ` ${practice.startTime}〜`}
                        {practice.endTime && practice.endTime}
                        {practice.location && ` @ ${practice.location}`}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">合奏練習の登録なし</p>
                  )}
                </div>
              </div>

              {practice?.repertoire && (
                <div className="mt-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                  <p className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-1">🎵 練習曲目</p>
                  <p className="text-sm text-foreground whitespace-pre-line">{practice.repertoire}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance summary */}
          {isLoading ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground mt-3 text-sm">読み込み中...</p>
              </CardContent>
            </Card>
          ) : isError ? (
            <Card className="border-0 shadow-md border border-red-100">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <p className="font-bold text-foreground">合奏出欠を読み込めませんでした</p>
                <p className="text-sm text-muted-foreground mt-1">{error.message || "ページを再読み込みしてください"}</p>
              </CardContent>
            </Card>
          ) : !practice ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <Music2 className="h-12 w-12 text-violet-500 mx-auto mb-3" />
                <p className="font-bold text-foreground">この日に合奏が登録されていません</p>
                <p className="text-sm text-muted-foreground mt-1">
                  合奏出欠を表示するには、運営が「本日の練習」でこの日を合奏として登録します。
                </p>
                {user?.role === "admin" && (
                  <Button className="mt-4" onClick={() => setLocation("/practice")}>合奏練習を登録する</Button>
                )}
              </CardContent>
            </Card>
          ) : absences.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-bold text-foreground">全員出席予定！</p>
                <p className="text-sm text-muted-foreground mt-1">
                  承認済みの欠席・遅刻・早退申請はありません
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Summary badges */}
              <div className="flex gap-3 flex-wrap">
                {(["absence", "late", "early_leave"] as const).map((type) => {
                  const count = grouped[type]?.length ?? 0;
                  if (count === 0) return null;
                  const cfg = TYPE_CONFIG[type];
                  return (
                    <div key={type} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-bold text-sm ${cfg.color}`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {cfg.label} {count}名
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600 font-bold text-sm">
                  <AlertCircle className="h-3.5 w-3.5" />
                  合計 {absences.length}名
                </div>
              </div>

              {/* Absence groups */}
              {(["absence", "late", "early_leave"] as const).map((type) => {
                const members = grouped[type] ?? [];
                if (members.length === 0) return null;
                const cfg = TYPE_CONFIG[type];
                const Icon = cfg.icon;
                return (
                  <Card key={type} className="border-0 shadow-md overflow-hidden">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon className="h-4 w-4" />
                        {cfg.label}
                        <Badge variant="secondary" className="ml-1">{members.length}名</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      {members.map((m) => (
                        <AttendanceMember
                          key={m.id}
                          name={m.requesterName}
                          part={m.requesterPart}
                          requestType={m.requestType as "absence" | "late" | "early_leave"}
                          arrivalTime={m.arrivalTime}
                          leaveTime={m.leaveTime}
                          reason={m.reason}
                        />
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
