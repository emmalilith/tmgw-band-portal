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
  practice: { label: "練習", color: "border-l-blue-500 bg-blue-50", badge: "bg-blue-100 text-blue-700" },
  event: { label: "イベント", color: "border-l-purple-500 bg-purple-50", badge: "bg-purple-100 text-purple-700" },
  lesson: { label: "レッスン", color: "border-l-amber-500 bg-amber-50", badge: "bg-amber-100 text-amber-700" },
  concert: { label: "演奏会", color: "border-l-red-500 bg-red-50", badge: "bg-red-100 text-red-700" },
  holiday: { label: "休日", color: "border-l-gray-400 bg-gray-50", badge: "bg-gray-100 text-gray-600" },
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
          <h1 className="font-serif text-3xl font-light">週間スケジュール</h1>
          <p className="text-sm text-muted-foreground mt-1">今週の練習・イベント詳細</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(d => subWeeks(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center min-w-[160px]">
            <p className="font-serif text-sm font-medium">
              {format(currentWeekStart, "M月d日", { locale: ja })} 〜 {format(weekEnd, "M月d日", { locale: ja })}
            </p>
            {isCurrentWeek && (
              <span className="text-xs text-primary font-medium">今週</span>
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
                className={`border shadow-sm transition-all ${isTodayDay ? "border-primary/30 bg-primary/2" : ""}`}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Day column */}
                    <div
                      className={`w-20 shrink-0 flex flex-col items-center justify-center py-4 rounded-l-xl border-r ${
                        isTodayDay
                          ? "bg-primary text-primary-foreground"
                          : isWeekend
                          ? "bg-secondary/80"
                          : "bg-secondary/40"
                      }`}
                    >
                      <span
                        className={`text-xs font-medium ${
                          isTodayDay ? "text-primary-foreground/70" : dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-muted-foreground"
                        }`}
                      >
                        {format(day, "E", { locale: ja })}
                      </span>
                      <span className={`text-2xl font-serif font-light ${isTodayDay ? "text-primary-foreground" : ""}`}>
                        {format(day, "d")}
                      </span>
                      {isTodayDay && (
                        <span className="text-xs text-primary-foreground/70 mt-0.5">今日</span>
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
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.badge}`}>
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
