import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  getDay,
  isToday,
  parseISO,
  startOfWeek,
  subWeeks,
  isSameDay,
} from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const typeConfig = {
  practice: { label: "🎵 練習", color: "border-l-violet-500 bg-violet-50", badge: "bg-violet-100 text-violet-700" },
  event: { label: "🎉 イベント", color: "border-l-pink-500 bg-pink-50", badge: "bg-pink-100 text-pink-700" },
  lesson: { label: "🎓 レッスン", color: "border-l-amber-500 bg-amber-50", badge: "bg-amber-100 text-amber-700" },
  concert: { label: "🎺 演奏会", color: "border-l-red-500 bg-red-50", badge: "bg-red-100 text-red-700" },
  holiday: { label: "🌴 休日", color: "border-l-slate-400 bg-slate-50", badge: "bg-slate-100 text-slate-600" },
};

export default function WeeklySchedule() {
  const [, setLocation] = useLocation();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  const startDate = format(currentWeekStart, "yyyy-MM-dd");
  const endDate = format(weekEnd, "yyyy-MM-dd");

  const { data: schedules, isLoading } = trpc.schedules.byWeek.useQuery({ startDate, endDate });

  const getSchedulesForDay = (day: Date) =>
    schedules?.filter(s => isSameDay(parseISO(s.scheduleDate), day)) ?? [];

  const isCurrentWeek = isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2"><span>🗓️</span> 週間スケジュール</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">今週の練習・イベント詳細</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(d => subWeeks(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center min-w-[160px]">
            <p className="font-black text-sm">
              {format(currentWeekStart, "M月d日", { locale: ja })} 〜 {format(weekEnd, "M月d日", { locale: ja })}
            </p>
            {isCurrentWeek && (
              <span className="text-xs font-black text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">今週</span>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(d => addWeeks(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(day => {
            const daySchedules = getSchedulesForDay(day);
            const dow = getDay(day);
            const isWeekend = dow === 0 || dow === 6;
            const isTodayDay = isToday(day);

            return (
              <Card
                key={day.toISOString()}
                className={`border-0 shadow-md rounded-2xl transition-all overflow-hidden ${isTodayDay ? "ring-2 ring-violet-400" : ""}`}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Day column */}
                    <div
                      className={`w-20 shrink-0 flex flex-col items-center justify-center py-4 ${
                        isTodayDay
                          ? "bg-gradient-to-b from-violet-600 to-purple-700 text-white"
                          : isWeekend
                          ? "bg-slate-100"
                          : "bg-white"
                      }`}
                    >
                      <span
                        className={`text-xs font-black ${
                          isTodayDay ? "text-white/80" : dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-muted-foreground"
                        }`}
                      >
                        {format(day, "E", { locale: ja })}
                      </span>
                      <span className={`text-2xl font-black ${isTodayDay ? "text-white" : ""}`}>
                        {format(day, "d")}
                      </span>
                      {isTodayDay && (
                        <span className="text-xs text-white/80 mt-0.5 font-bold">今日</span>
                      )}
                    </div>

                    {/* Events column */}
                    <div className="flex-1 p-3 space-y-2">
                      {daySchedules.length > 0 ? (
                        daySchedules.map(s => {
                          const cfg = typeConfig[s.type];
                          return (
                            <div
                              key={s.id}
                              className={`flex items-start gap-3 p-2.5 rounded-lg border-l-4 ${cfg.color}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${cfg.badge}`}>
                                    {cfg.label}
                                  </span>
                                  {s.startTime && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {s.startTime}{s.endTime ? ` 〜 ${s.endTime}` : ""}
                                    </span>
                                  )}
                                  {s.location && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {s.location}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-foreground">{s.title}</p>
                                {s.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground py-2 pl-1">予定なし</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Link to monthly */}
      <div className="text-center">
        <button
          onClick={() => setLocation("/schedule/monthly")}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          月間カレンダーで見る →
        </button>
      </div>
    </div>
  );
}
