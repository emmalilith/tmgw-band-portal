import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { differenceInDays, format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import {
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Music2,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";

function CountdownCard({ eventDate, title, venue }: { eventDate: Date; title: string; venue?: string | null }) {
  const days = differenceInDays(new Date(eventDate), new Date());
  const isUrgent = days <= 7;
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-xl ${
      isUrgent
        ? "bg-gradient-to-br from-orange-500 via-red-500 to-pink-600"
        : "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700"
    }`}>
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute top-12 right-12 w-16 h-16 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🎺</span>
          <span className="text-xs text-white/80 uppercase tracking-widest font-bold">次回演奏会</span>
          {isUrgent && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">もうすぐ！</span>}
        </div>
        <h2 className="text-xl font-bold text-white mb-1 leading-tight">{title}</h2>
        {venue && <p className="text-sm text-white/70 mb-4">{venue}</p>}
        <div className="flex items-end gap-2">
          <span className="text-7xl font-black text-white leading-none drop-shadow-lg">{days}</span>
          <span className="text-white/80 mb-2 text-xl font-bold">日後</span>
        </div>
        <p className="text-xs text-white/60 mt-2">
          {format(new Date(eventDate), "yyyy年M月d日（E）", { locale: ja })}
        </p>
      </div>
    </div>
  );
}

function PracticeTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; style: string; emoji: string }> = {
    ensemble: { label: "合奏", style: "bg-violet-100 text-violet-700 border-violet-200", emoji: "🎼" },
    individual: { label: "個人練習", style: "bg-emerald-100 text-emerald-700 border-emerald-200", emoji: "🎵" },
    section: { label: "パート練習", style: "bg-orange-100 text-orange-700 border-orange-200", emoji: "🎶" },
  };
  const info = map[type] ?? { label: type, style: "bg-gray-100 text-gray-700 border-gray-200", emoji: "🎵" };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${info.style}`}>
      <span>{info.emoji}</span>
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
  const { data: myAttendance } = trpc.attendance.mine.useQuery();

  const today = format(new Date(), "yyyy年M月d日（E）", { locale: ja });
  const recentAnnouncements = announcements?.slice(0, 5) ?? [];
  const nextLesson = upcomingLessons?.[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "おはようございます" : hour < 18 ? "こんにちは" : "こんばんは";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{today}</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            {greeting}、<span className="gradient-text">{user?.name ?? "部員"}</span>さん 👋
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-white border rounded-xl px-3 py-2 shadow-sm">
          <span className="text-base">🎺</span>
          <span className="font-bold">TMGW Brass Band</span>
        </div>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
              className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl cursor-pointer hover:scale-[1.01] transition-transform"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎺</span>
                <span className="text-xs text-white/80 uppercase tracking-widest font-bold">次回演奏会</span>
              </div>
              <p className="text-white/70 text-sm">演奏会が登録されていません</p>
              <p className="text-xs text-white/50 mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                クリックして追加する
              </p>
            </div>
          )}
        </div>

        {/* Today's Practice */}
        <div className="lg:col-span-2">
          <Card className="h-full border-0 shadow-md bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <span className="text-xl">🎵</span>
                本日の練習予定
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayPractice && todayPractice.length > 0 ? (
                <div className="space-y-3">
                  {todayPractice.map(p => (
                    <div key={p.id} className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <PracticeTypeBadge type={p.practiceType} />
                          {p.startTime && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" />
                              {p.startTime}{p.endTime ? ` 〜 ${p.endTime}` : ""}
                            </span>
                          )}
                        </div>
                        {p.practiceType === "ensemble" && p.repertoire && (
                          <p className="text-sm font-bold text-foreground">{p.repertoire}</p>
                        )}
                        {p.location && <p className="text-xs text-muted-foreground mt-0.5">📍 {p.location}</p>}
                        {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-5xl mb-3 opacity-30">🎵</div>
                  <p className="text-sm font-medium">本日の練習予定はありません</p>
                  {(user?.role === "admin" || user?.role === "section_leader") && (
                    <button
                      onClick={() => setLocation("/practice")}
                      className="text-xs text-primary hover:underline mt-2 block mx-auto font-bold"
                    >
                      ＋ 練習予定を追加する
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Personal attendance record */}
      <Card className="border-0 shadow-md bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-black">📋 自分の出欠記録</p>
            <p className="text-xs text-muted-foreground mt-1">先生の最終承認済みの記録です</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 text-xs font-black">欠席 {myAttendance?.absenceCount ?? 0}</span>
            <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1.5 text-xs font-black">遅刻 {myAttendance?.lateCount ?? 0}</span>
            <span className="rounded-full bg-sky-50 text-sky-700 px-3 py-1.5 text-xs font-black">早退 {myAttendance?.earlyLeaveCount ?? 0}</span>
          </div>
          {user?.role === "admin" && (
            <button onClick={() => setLocation("/admin/organizer")} className="text-xs font-black text-violet-700 hover:underline">全員の記録を管理 →</button>
          )}
        </CardContent>
      </Card>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Announcements */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-md bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <span className="text-xl">📢</span>
                  連絡事項
                </CardTitle>
                <button
                  onClick={() => setLocation("/announcements")}
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-bold bg-primary/10 px-3 py-1 rounded-full"
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
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer transition-all hover:scale-[1.005] border border-transparent hover:border-border/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          {a.pinned && <span className="text-xs font-bold text-orange-500">📌 ピン留め</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            a.category === "important"
                              ? "bg-red-100 text-red-600"
                              : a.category === "warning"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-blue-100 text-blue-600"
                          }`}>
                            {a.category === "important" ? "🚨 重要" : a.category === "warning" ? "⚠️ 注意" : "ℹ️ お知らせ"}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-foreground truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(a.createdAt), "M月d日", { locale: ja })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-5xl mb-3 opacity-30">📢</div>
                  <p className="text-sm font-medium">連絡事項はありません</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick links + Next lesson */}
        <div className="space-y-4">
          {/* Next lesson */}
          {nextLesson && (
            <Card className="border-0 shadow-md bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <span className="text-lg">🎓</span>
                  次回レッスン
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-bold text-sm">{nextLesson.instructorName} 先生</p>
                {nextLesson.targetPart && (
                  <p className="text-xs text-muted-foreground font-medium">{nextLesson.targetPart}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                  <Calendar className="w-3 h-3" />
                  {format(parseISO(nextLesson.visitDate), "M月d日（E）", { locale: ja })}
                  {nextLesson.startTime && ` ${nextLesson.startTime}`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card className="border-0 shadow-md bg-white rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                クイックアクセス
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {[
                { emoji: "📝", label: "欠席・遅刻申請", path: "/absence", color: "hover:bg-orange-50 hover:text-orange-700" },
                { emoji: "📅", label: "月間スケジュール", path: "/schedule/monthly", color: "hover:bg-violet-50 hover:text-violet-700" },
                { emoji: "🎓", label: "レッスン講師確認", path: "/lessons", color: "hover:bg-sky-50 hover:text-sky-700" },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left font-semibold text-sm ${item.color}`}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
