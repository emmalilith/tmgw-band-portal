import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { format, differenceInDays, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Bell,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Music,
  Music2,
  Star,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";

function CountdownCard({ eventDate, title, venue }: { eventDate: Date; title: string; venue?: string | null }) {
  const days = differenceInDays(new Date(eventDate), new Date());
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-xl">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 right-4 w-32 h-32 rounded-full border border-amber-400/30" />
        <div className="absolute top-8 right-8 w-20 h-20 rounded-full border border-amber-400/20" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-400 uppercase tracking-widest font-medium">次回演奏会</span>
        </div>
        <h2 className="font-serif text-xl font-light text-white mb-1">{title}</h2>
        {venue && <p className="text-sm text-slate-400 mb-4">{venue}</p>}
        <div className="flex items-end gap-2">
          <span className="font-serif text-6xl font-light text-amber-400 leading-none">{days}</span>
          <span className="text-slate-300 mb-2 text-lg">日後</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {format(new Date(eventDate), "yyyy年M月d日（E）", { locale: ja })}
        </p>
      </div>
    </div>
  );
}

function PracticeTypeLabel({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    ensemble: { label: "合奏", color: "bg-blue-100 text-blue-800 border-blue-200" },
    individual: { label: "個人練習", color: "bg-green-100 text-green-800 border-green-200" },
    section: { label: "パート練習", color: "bg-purple-100 text-purple-800 border-purple-200" },
  };
  const info = map[type] ?? { label: type, color: "bg-gray-100 text-gray-800 border-gray-200" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${info.color}`}>
      {info.label}
    </span>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: featuredEvent } = trpc.events.featured.useQuery();
  const { data: todayPractice } = trpc.practice.today.useQuery();
  const { data: announcements } = trpc.announcements.list.useQuery();
  const { data: upcomingLessons } = trpc.lessonVisits.upcoming.useQuery();

  const today = format(new Date(), "yyyy年M月d日（E）", { locale: ja });
  const pinnedAnnouncements = announcements?.filter(a => a.pinned).slice(0, 3) ?? [];
  const recentAnnouncements = announcements?.slice(0, 5) ?? [];
  const nextLesson = upcomingLessons?.[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="font-serif text-3xl font-light text-foreground mt-1">
            おはようございます、<span className="text-primary font-medium">{user?.name ?? "部員"}</span>さん
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-card border rounded-lg px-3 py-2">
          <Music2 className="w-4 h-4 text-amber-500" />
          <span className="font-serif">吹奏楽部ポータル</span>
        </div>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Countdown */}
        <div className="lg:col-span-1">
          {featuredEvent ? (
            <CountdownCard
              eventDate={featuredEvent.eventDate}
              title={featuredEvent.title}
              venue={featuredEvent.venue}
            />
          ) : (
            <div
              onClick={() => setLocation("/events")}
              className="rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-xl cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-400 uppercase tracking-widest">次回演奏会</span>
              </div>
              <p className="text-slate-400 text-sm">演奏会が登録されていません</p>
              <p className="text-xs text-slate-500 mt-2">クリックして追加する</p>
            </div>
          )}
        </div>

        {/* Today's Practice */}
        <div className="lg:col-span-2">
          <Card className="h-full border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-serif text-lg font-medium">
                <Music className="w-5 h-5 text-primary" />
                本日の練習予定
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayPractice && todayPractice.length > 0 ? (
                <div className="space-y-3">
                  {todayPractice.map(p => (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <PracticeTypeLabel type={p.practiceType} />
                          {p.startTime && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {p.startTime}{p.endTime ? ` 〜 ${p.endTime}` : ""}
                            </span>
                          )}
                        </div>
                        {p.practiceType === "ensemble" && p.repertoire && (
                          <p className="text-sm font-medium text-foreground">{p.repertoire}</p>
                        )}
                        {p.location && <p className="text-xs text-muted-foreground mt-0.5">{p.location}</p>}
                        {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Music2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">本日の練習予定はありません</p>
                  {(user?.role === "admin" || user?.role === "section_leader") && (
                    <button
                      onClick={() => setLocation("/practice")}
                      className="text-xs text-primary hover:underline mt-2 block mx-auto"
                    >
                      練習予定を追加する
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Announcements */}
        <div className="lg:col-span-2">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-serif text-lg font-medium">
                  <Bell className="w-5 h-5 text-primary" />
                  連絡事項
                </CardTitle>
                <button
                  onClick={() => setLocation("/announcements")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  すべて見る →
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {recentAnnouncements.length > 0 ? (
                <div className="space-y-2">
                  {recentAnnouncements.map(a => (
                    <div
                      key={a.id}
                      onClick={() => setLocation("/announcements")}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors border border-transparent hover:border-border/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {a.pinned && <span className="text-xs text-amber-600 font-medium">📌</span>}
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border ${
                              a.category === "important"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : a.category === "warning"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {a.category === "important" ? "重要" : a.category === "warning" ? "注意" : "お知らせ"}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(a.createdAt), "M月d日", { locale: ja })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">連絡事項はありません</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick links + Next lesson */}
        <div className="space-y-4">
          {/* Next lesson */}
          {nextLesson && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 font-serif text-base font-medium">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  次回レッスン
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-sm">{nextLesson.instructorName} 先生</p>
                {nextLesson.targetPart && (
                  <p className="text-xs text-muted-foreground">{nextLesson.targetPart}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(parseISO(nextLesson.visitDate), "M月d日（E）", { locale: ja })}
                  {nextLesson.startTime && ` ${nextLesson.startTime}`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-base font-medium">クイックアクセス</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: BookOpen, label: "欠席・遅刻申請", path: "/absence" },
                { icon: Calendar, label: "月間スケジュール", path: "/schedule/monthly" },
                { icon: GraduationCap, label: "レッスン講師確認", path: "/lessons" },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <item.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
