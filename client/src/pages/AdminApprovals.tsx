import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { BookOpen, CheckCircle2, Shield, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AbsenceRequest = {
  id: number;
  requestType: string;
  targetDate: string;
  arrivalTime?: string | null;
  leaveTime?: string | null;
  reason: string;
  status: string;
  createdAt: Date;
  sectionLeaderApprovedAt?: Date | null;
  sectionLeaderComment?: string | null;
  teacherApprovedAt?: Date | null;
  teacherComment?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterPart?: string | null;
};

const requestTypeConfig: Record<string, { label: string; color: string }> = {
  absence: { label: "🚫 欠席", color: "bg-red-50 text-red-700 border-red-200" },
  late: { label: "⏰ 遅刻", color: "bg-orange-50 text-orange-700 border-orange-200" },
  early_leave: { label: "🚪 早退", color: "bg-blue-50 text-blue-700 border-blue-200" },
};

export default function AdminApprovals() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";
  const isLeaderOrAdmin = user?.role === "admin" || user?.role === "section_leader";

  if (!isLeaderOrAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>このページへのアクセス権限がありません</p>
        </div>
      </div>
    );
  }

  const { data: pending, isLoading } = trpc.absence.pending.useQuery();
  const { data: all } = isAdmin ? trpc.absence.all.useQuery() : { data: undefined };

  const sectionApproveMutation = trpc.absence.sectionApprove.useMutation({
    onSuccess: () => { utils.absence.pending.invalidate(); utils.absence.all.invalidate(); toast.success("処理しました"); setApproveDialog(null); },
    onError: () => toast.error("処理に失敗しました"),
  });
  const teacherApproveMutation = trpc.absence.teacherApprove.useMutation({
    onSuccess: () => { utils.absence.pending.invalidate(); utils.absence.all.invalidate(); toast.success("処理しました"); setApproveDialog(null); },
    onError: () => toast.error("処理に失敗しました"),
  });

  const [approveDialog, setApproveDialog] = useState<{ id: number; mode: "section" | "teacher"; approve: boolean } | null>(null);
  const [comment, setComment] = useState("");

  const handleApprove = () => {
    if (!approveDialog) return;
    if (approveDialog.mode === "section") {
      sectionApproveMutation.mutate({ id: approveDialog.id, approved: approveDialog.approve, comment });
    } else {
      teacherApproveMutation.mutate({ id: approveDialog.id, approved: approveDialog.approve, comment });
    }
    setComment("");
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      section_approved: "bg-blue-50 text-blue-700 border-blue-200",
      teacher_approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
    };
    const labels: Record<string, string> = {
      pending: "⏳ 申請中",
      section_approved: "✅ パートリーダー承認済",
      teacher_approved: "🎉 承認完了",
      rejected: "❌ 却下",
    };
    return (
      <span className={`text-xs px-3 py-1 rounded-full border font-bold ${map[status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
        {labels[status] ?? status}
      </span>
    );
  };

  const RequestCard = ({ r, showActions }: { r: AbsenceRequest; showActions: boolean }) => (
    <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {statusBadge(r.status)}
              <span className={`text-xs px-3 py-1 rounded-full border font-bold ${requestTypeConfig[r.requestType]?.color ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                {requestTypeConfig[r.requestType]?.label ?? r.requestType}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm">
                {r.requesterName?.trim() || "名前未設定"} さん
              </p>
              {r.requesterPart?.trim() && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">
                  {r.requesterPart}
                </span>
              )}
            </div>
            {r.requesterEmail && (
              <p className="text-xs text-muted-foreground mt-0.5">{r.requesterEmail}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {format(parseISO(r.targetDate), "yyyy年M月d日（E）", { locale: ja })}
              {r.requestType === "late" && r.arrivalTime && (
                <span className="ml-2">到着予定: {r.arrivalTime}</span>
              )}
              {r.requestType === "early_leave" && r.leaveTime && (
                <span className="ml-2">早退予定: {r.leaveTime}</span>
              )}
            </p>
            <p className="text-sm mt-1">{r.reason}</p>
            {r.sectionLeaderApprovedAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                <CheckCircle2 className="w-3 h-3 text-blue-500" />
                <span>パートリーダー確認済: {format(new Date(r.sectionLeaderApprovedAt), "M/d HH:mm")}</span>
                {r.sectionLeaderComment && <span>「{r.sectionLeaderComment}」</span>}
              </div>
            )}
          </div>
          {showActions && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => { setApproveDialog({ id: r.id, mode: isAdmin && r.status === "section_approved" ? "teacher" : "section", approve: true }); setComment(""); }}
              >
                <CheckCircle2 className="w-3 h-3" />
                承認
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => { setApproveDialog({ id: r.id, mode: isAdmin && r.status === "section_approved" ? "teacher" : "section", approve: false }); setComment(""); }}
              >
                <XCircle className="w-3 h-3" />
                却下
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const pendingForMe = pending?.filter(r => {
    if (isAdmin) return r.status === "section_approved";
    return r.status === "pending";
  }) ?? [];

  const pendingForSection = pending?.filter(r => r.status === "pending") ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black flex items-center gap-2"><span>🛡️</span> 申請承認</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">遅刻・欠席・早退申請の承認・却下を行います</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            承認待ち
            {pendingForMe.length > 0 && (
              <span className="ml-1.5 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {pendingForMe.length}
              </span>
            )}
          </TabsTrigger>
          {isAdmin && <TabsTrigger value="section">パートリーダー待ち</TabsTrigger>}
          {isAdmin && <TabsTrigger value="all">全申請</TabsTrigger>}
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}
            </div>
          ) : pendingForMe.length > 0 ? (
            pendingForMe.map(r => <RequestCard key={r.id} r={r as AbsenceRequest} showActions={true} />)
          ) : (
            <Card className="border-0 shadow-md rounded-2xl">
              <CardContent className="py-12 text-center text-muted-foreground">
                <div className="text-5xl mb-4 opacity-30">🎉</div>
                <p className="font-medium">承認待ちの申請はありません</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="section" className="mt-4 space-y-3">
            {pendingForSection.length > 0 ? (
              pendingForSection.map(r => <RequestCard key={r.id} r={r as AbsenceRequest} showActions={false} />)
            ) : (
              <Card className="border shadow-sm">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>パートリーダー承認待ちの申請はありません</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="all" className="mt-4 space-y-3">
            {all?.map(r => <RequestCard key={r.id} r={r as AbsenceRequest} showActions={false} />) ?? (
              <Card className="border shadow-sm">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>申請はありません</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Approve/Reject dialog */}
      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif font-medium">
              {approveDialog?.approve ? "申請を承認しますか？" : "申請を却下しますか？"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>コメント（任意）</Label>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="コメントを入力..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>キャンセル</Button>
            <Button
              onClick={handleApprove}
              disabled={sectionApproveMutation.isPending || teacherApproveMutation.isPending}
              className={approveDialog?.approve ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90"}
            >
              {approveDialog?.approve ? "承認する" : "却下する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
