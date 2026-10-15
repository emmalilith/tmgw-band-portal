import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Music2, Loader2, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPart, setRegPart] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const returnTo = new URLSearchParams(window.location.search).get("returnTo") ?? "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "ログインに失敗しました");
        return;
      }
      await utils.auth.me.invalidate();
      navigate(returnTo);
    } catch {
      toast.error("ネットワークエラーが発生しました");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword.length < 8) {
      toast.error("パスワードは8文字以上で入力してください");
      return;
    }
    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, part: regPart || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "登録に失敗しました");
        return;
      }
      toast.success(`ようこそ、${data.user?.name}さん！`);
      await utils.auth.me.invalidate();
      navigate(returnTo);
    } catch {
      toast.error("ネットワークエラーが発生しました");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm mb-4 shadow-2xl">
            <Music2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">TMGW Brass Band</h1>
          <p className="text-white/70 mt-1 text-sm font-medium">部員専用ポータル</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6">
            <Tabs defaultValue="login">
              <TabsList className="w-full mb-6 bg-purple-50">
                <TabsTrigger value="login" className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold">
                  ログイン
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold">
                  新規登録
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="font-bold text-gray-700">メールアドレス</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="font-bold text-gray-700">パスワード</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPw ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="border-gray-200 focus:border-purple-500 focus:ring-purple-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPw(!showLoginPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-black py-2.5 rounded-xl shadow-lg"
                  >
                    {loginLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    ログイン
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-name" className="font-bold text-gray-700">氏名</Label>
                    <Input
                      id="reg-name"
                      placeholder="山田 太郎"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      className="border-gray-200 focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="font-bold text-gray-700">メールアドレス</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="your@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      className="border-gray-200 focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-part" className="font-bold text-gray-700">パート <span className="text-gray-400 font-normal">（任意）</span></Label>
                    <Input
                      id="reg-part"
                      placeholder="例: Flute, Clarinet, Trumpet..."
                      value={regPart}
                      onChange={(e) => setRegPart(e.target.value)}
                      className="border-gray-200 focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="font-bold text-gray-700">パスワード <span className="text-gray-400 font-normal">（8文字以上）</span></Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showRegPw ? "text" : "password"}
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        minLength={8}
                        className="border-gray-200 focus:border-purple-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPw(!showRegPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={regLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-black py-2.5 rounded-xl shadow-lg"
                  >
                    {regLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    アカウントを作成
                  </Button>
                  <p className="text-xs text-center text-gray-500">
                    ※ 管理者メールアドレスに指定されたユーザーが管理者（顧問）になります
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
