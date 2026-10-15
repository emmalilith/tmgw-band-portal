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
import { Shield, Trash2, Users } from "lucide-react";
import { toast } from "sonner";



const roleConfig = {
  admin: { label: "🛠️ Organizer", color: "bg-amber-100 text-amber-800 border-amber-200" },
  section_leader: { label: "⭐ パートリーダー", color: "bg-blue-100 text-blue-800 border-blue-200" },
  member: { label: "🎵 部員", color: "bg-violet-100 text-violet-700 border-violet-200" },
  user: { label: "🎵 部員", color: "bg-violet-100 text-violet-700 border-violet-200" },
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
    onError: (error) => toast.error(error.message || "更新に失敗しました"),
  });
  const removeUserMutation = trpc.users.remove.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success("アカウントを削除しました"); },
    onError: (error) => toast.error(error.message || "削除に失敗しました"),
  });

  const removeAccount = (member: { id: number; name: string | null }) => {
    if (!window.confirm(`${member.name ?? "この部員"}のアカウントを削除しますか？\nこの操作を行うと、本人はログインできなくなります。`)) return;
    removeUserMutation.mutate({ userId: member.id });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
          <h1 className="text-3xl font-black flex items-center gap-2"><span>👥</span> メンバー・organizer管理</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">organizerの追加・変更、部員アカウントの削除を管理します</p>
      </div>

      {/* Role explanation */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="text-2xl mb-2">🎓</div>
            <p className="font-black text-sm text-amber-800 mb-1">Organizer</p>
            <p className="text-xs text-amber-700/70">全機能へのアクセス、予定・メンバー・出欠の管理</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="text-2xl mb-2">⭐</div>
            <p className="font-black text-sm text-blue-800 mb-1">パートリーダー</p>
            <p className="text-xs text-blue-700/70">欠席申請の一次承認、練習予定の管理</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50">
          <CardContent className="p-4">
            <div className="text-2xl mb-2">🎵</div>
            <p className="font-black text-sm text-violet-800 mb-1">部員</p>
            <p className="text-xs text-violet-700/70">閲覧・申請のみ</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : (
        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-black text-lg">
              <Users className="w-5 h-5 text-violet-600" />
              🎵 部員一覧 ({members?.length ?? 0}名)
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {format(new Date(m.createdAt), "yyyy/M/d 登録", { locale: ja })}
                      </span>
                      <Select
                        value={m.role}
                        onValueChange={v => updateRoleMutation.mutate({ userId: m.id, role: v as any })}
                        disabled={m.id === user?.id || updateRoleMutation.isPending}
                      >
                        <SelectTrigger className={`w-40 h-8 text-xs border ${roleCfg.color}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Organizer</SelectItem>
                          <SelectItem value="section_leader">パートリーダー</SelectItem>
                          <SelectItem value="member">部員</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={m.id === user?.id || removeUserMutation.isPending}
                        onClick={() => removeAccount(m)}
                        title={m.id === user?.id ? "自分自身は削除できません" : "アカウントを削除"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
