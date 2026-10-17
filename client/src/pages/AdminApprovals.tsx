import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { CheckCircle2, Shield, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ApprovalMode = "section" | "president" | "teacher";
type AbsenceRequest = {
  id: number; requestType: string; targetDate: string; arrivalTime?: string | null; leaveTime?: string | null; reason: string; status: string; createdAt: Date;
  requesterName?: string | null; requesterEmail?: string | null; requesterPart?: string | null;
  sectionLeaderApprovedAt?: Date | null; sectionLeaderComment?: string | null;
  presidentApprovedAt?: Date | null; presidentComment?: string | null;
  teacherApprovedAt?: Date | null; teacherComment?: string | null;
};

const requestTypeConfig: Record<string, string> = { absence: "🚫 欠席", late: "⏰ 遅刻", early_leave: "🚪 早退" };
const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "① パートリーダー待ち", color: "bg-amber-50 text-amber-700 border-amber-200" },
  section_approved: { label: "② 部長待ち", color: "bg-blue-50 text-blue-700 border-blue-200" },
  president_approved: { label: "③ 顧問待ち", color: "bg-violet-50 text-violet-700 border-violet-200" },
  teacher_approved: { label: "🎉 承認完了", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "❌ 却下", color: "bg-red-50 text-red-700 border-red-200" },
};

export default function AdminApprovals() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const canLead = Boolean(user?.isSectionLeader || user?.isPresident || user?.isTeacher);
  const canViewAll = Boolean(user?.isPresident || user?.isTeacher);
  const { data: pending, isLoading } = trpc.absence.pending.useQuery(undefined, { enabled: canLead });
  const { data: all } = trpc.absence.all.useQuery(undefined, { enabled: canViewAll });
  const [dialog, setDialog] = useState<{ id: number; mode: ApprovalMode; approve: boolean } | null>(null);
  const [comment, setComment] = useState("");

  const finish = () => { utils.absence.pending.invalidate(); utils.absence.all.invalidate(); setDialog(null); toast.success("処理しました"); };
  const sectionMutation = trpc.absence.sectionApprove.useMutation({ onSuccess: finish, onError: (e) => toast.error(e.message || "処理に失敗しました") });
  const presidentMutation = trpc.absence.presidentApprove.useMutation({ onSuccess: finish, onError: (e) => toast.error(e.message || "処理に失敗しました") });
  const teacherMutation = trpc.absence.teacherApprove.useMutation({ onSuccess: finish, onError: (e) => toast.error(e.message || "処理に失敗しました") });

  const actionFor = (request: AbsenceRequest): ApprovalMode | null => {
    if (request.status === "pending" && user?.isSectionLeader) return "section";
    if (request.status === "section_approved" && user?.isPresident) return "president";
    if (request.status === "president_approved" && user?.isTeacher) return "teacher";
    return null;
  };
  const actionLabel = (mode: ApprovalMode) => mode === "section" ? "パートリーダー一次承認" : mode === "president" ? "部長二次承認" : "顧問最終承認";
  const submit = () => {
    if (!dialog) return;
    const payload = { id: dialog.id, approved: dialog.approve, comment };
    if (dialog.mode === "section") sectionMutation.mutate(payload);
    if (dialog.mode === "president") presidentMutation.mutate(payload);
    if (dialog.mode === "teacher") teacherMutation.mutate(payload);
    setComment("");
  };

  if (!canLead) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground"><div className="text-center"><Shield className="w-12 h-12 mx-auto mb-4 opacity-20" /><p>このページはパートリーダー・部長・顧問のみ利用できます</p></div></div>;

  const CardItem = ({ request, actions }: { request: AbsenceRequest; actions: boolean }) => {
    const mode = actionFor(request);
    return <Card className="border-0 shadow-md rounded-2xl"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0">
      <div className="flex flex-wrap items-center gap-2 mb-2"><span className={`text-xs px-3 py-1 rounded-full border font-bold ${statusConfig[request.status]?.color}`}>{statusConfig[request.status]?.label}</span><span className="text-xs px-3 py-1 rounded-full border font-bold bg-orange-50 text-orange-700 border-orange-200">{requestTypeConfig[request.requestType]}</span></div>
      <p className="font-bold text-sm">{request.requesterName?.trim() || "名前未設定"} さん {request.requesterPart && <span className="text-[11px] ml-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{request.requesterPart}</span>}</p>
      {request.requesterEmail && <p className="text-xs text-muted-foreground">{request.requesterEmail}</p>}
      <p className="text-sm text-muted-foreground mt-1">{format(parseISO(request.targetDate), "yyyy年M月d日（E）", { locale: ja })}{request.requestType === "late" && request.arrivalTime && ` ・到着予定 ${request.arrivalTime}`}{request.requestType === "early_leave" && request.leaveTime && ` ・早退予定 ${request.leaveTime}`}</p>
      <p className="text-sm mt-1">{request.reason}</p>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p className={request.sectionLeaderApprovedAt ? "text-blue-700" : ""}>① パートリーダー {request.sectionLeaderApprovedAt ? `確認済 ${format(new Date(request.sectionLeaderApprovedAt), "M/d HH:mm")}` : "確認待ち"}</p>
        <p className={request.presidentApprovedAt ? "text-fuchsia-700" : ""}>② 部長 {request.presidentApprovedAt ? `確認済 ${format(new Date(request.presidentApprovedAt), "M/d HH:mm")}` : "確認待ち"}</p>
        <p className={request.teacherApprovedAt ? "text-emerald-700" : ""}>③ 顧問 {request.teacherApprovedAt ? `確認済 ${format(new Date(request.teacherApprovedAt), "M/d HH:mm")}` : "確認待ち"}</p>
      </div>
    </div>{actions && mode && <div className="flex flex-col gap-1.5 shrink-0"><Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setDialog({ id: request.id, mode, approve: true }); setComment(""); }}><CheckCircle2 className="w-3 h-3" />承認</Button><Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30" onClick={() => { setDialog({ id: request.id, mode, approve: false }); setComment(""); }}><XCircle className="w-3 h-3" />却下</Button></div>}</div></CardContent></Card>;
  };

  const sectionQueue = pending?.filter((request) => request.status === "pending") ?? [];
  const presidentQueue = pending?.filter((request) => request.status === "section_approved") ?? [];
  const teacherQueue = pending?.filter((request) => request.status === "president_approved") ?? [];
  const Queue = ({ requests }: { requests: typeof sectionQueue }) => isLoading
    ? <div className="h-24 rounded-xl bg-secondary animate-pulse" />
    : requests.length
      ? <div className="space-y-3">{requests.map((request) => <CardItem key={request.id} request={request as AbsenceRequest} actions />)}</div>
      : <Card className="border-0 shadow-md rounded-2xl"><CardContent className="py-12 text-center text-muted-foreground">🎉 承認待ちの申請はありません</CardContent></Card>;

  return <div className="max-w-3xl mx-auto space-y-6"><div><h1 className="text-3xl font-black flex items-center gap-2"><span>🛡️</span>申請承認</h1><p className="text-sm text-muted-foreground mt-1 font-medium">パートリーダー → 部長 → 顧問の三段階で確認します。</p></div>
    <Tabs defaultValue={user?.isSectionLeader ? "section" : user?.isPresident ? "president" : "teacher"}><TabsList className="flex flex-wrap h-auto justify-start">{user?.isSectionLeader && <TabsTrigger value="section">① パートリーダー待ち {sectionQueue.length ? `(${sectionQueue.length})` : ""}</TabsTrigger>}{user?.isPresident && <TabsTrigger value="president">② 部長待ち {presidentQueue.length ? `(${presidentQueue.length})` : ""}</TabsTrigger>}{user?.isTeacher && <TabsTrigger value="teacher">③ 顧問待ち {teacherQueue.length ? `(${teacherQueue.length})` : ""}</TabsTrigger>}{canViewAll && <TabsTrigger value="all">全申請</TabsTrigger>}</TabsList>
      {user?.isSectionLeader && <TabsContent value="section" className="mt-4"><Queue requests={sectionQueue} /></TabsContent>}
      {user?.isPresident && <TabsContent value="president" className="mt-4"><Queue requests={presidentQueue} /></TabsContent>}
      {user?.isTeacher && <TabsContent value="teacher" className="mt-4"><Queue requests={teacherQueue} /></TabsContent>}
      {canViewAll && <TabsContent value="all" className="mt-4 space-y-3">{all?.map((request) => <CardItem key={request.id} request={request as AbsenceRequest} actions={false} />) ?? <Card><CardContent className="py-12 text-center text-muted-foreground">申請はありません</CardContent></Card>}</TabsContent>}
    </Tabs>
    <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{dialog?.approve ? "申請を承認しますか？" : "申請を却下しますか？"}</DialogTitle></DialogHeader><p className="text-sm font-bold text-violet-700">{dialog && actionLabel(dialog.mode)}</p><div className="space-y-1.5 py-2"><Label>コメント（任意）</Label><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="コメントを入力..." rows={2} /></div><DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>キャンセル</Button><Button onClick={submit} disabled={sectionMutation.isPending || presidentMutation.isPending || teacherMutation.isPending} className={dialog?.approve ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90"}>{dialog?.approve ? "承認する" : "却下する"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
