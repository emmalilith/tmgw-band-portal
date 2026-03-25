import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Shield, Users } from "lucide-react";
import { toast } from "sonner";



const roleConfig = {
  admin: { label: "顧問", color: "bg-amber-100 text-amber-800 border-amber-200" },
  section_leader: { label: "パートリーダー", color: "bg-blue-100 text-blue-800 border-blue-200" },
  member: { label: "部員", color: "bg-slate-100 text-slate-700 border-slate-200" },
  user: { label: "部員", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

export default function AdminUsers() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>このページへのアクセス権限がありません</p>
        </div>
      </div>
    );
  }

  const { data: members, isLoading } = trpc.users.list.useQuery();
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success("ロールを更新しました"); },
    onError: () => toast.error("更新に失敗しました"),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light">メンバー管理</h1>
        <p className="text-sm text-muted-foreground mt-1">部員のロールと権限を管理します</p>
      </div>

      {/* Role explanation */}
      <Card className="border shadow-sm bg-secondary/30">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">ロール説明</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="inline-block text-xs px-2 py-0.5 rounded border font-medium bg-amber-100 text-amber-800 border-amber-200 mb-1">顧問</span>
              <p className="text-xs text-muted-foreground">全機能へのアクセス、欠席申請の最終承認</p>
            </div>
            <div>
              <span className="inline-block text-xs px-2 py-0.5 rounded border font-medium bg-blue-100 text-blue-800 border-blue-200 mb-1">パートリーダー</span>
              <p className="text-xs text-muted-foreground">欠席申請の一次承認、練習予定の管理</p>
            </div>
            <div>
              <span className="inline-block text-xs px-2 py-0.5 rounded border font-medium bg-slate-100 text-slate-700 border-slate-200 mb-1">部員</span>
              <p className="text-xs text-muted-foreground">閲覧・申請のみ</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-serif text-lg font-medium">
              <Users className="w-5 h-5 text-primary" />
              部員一覧 ({members?.length ?? 0}名)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {members?.map(m => {
                const roleCfg = roleConfig[m.role as keyof typeof roleConfig] ?? roleConfig.user;
                return (
                  <div key={m.id} className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {m.name?.charAt(0).toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.name ?? "名前未設定"}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.email ?? "-"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {format(new Date(m.createdAt), "yyyy/M/d 登録", { locale: ja })}
                      </span>
                      <Select
                        value={m.role}
                        onValueChange={v => updateRoleMutation.mutate({ userId: m.id, role: v as any })}
                        disabled={m.id === user?.id}
                      >
                        <SelectTrigger className={`w-40 h-8 text-xs border ${roleCfg.color}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">顧問</SelectItem>
                          <SelectItem value="section_leader">パートリーダー</SelectItem>
                          <SelectItem value="member">部員</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
