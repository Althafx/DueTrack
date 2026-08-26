import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser, useLogin } from "@/hooks/useAuth";
import { getErrorMessage } from "@/services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { data: user, isLoading: checkingSession } = useCurrentUser();
  const loginMutation = useLogin();
  const navigate = useNavigate();

  if (!checkingSession && user) {
    return <Navigate to={user.role === "DEALER" ? "/dashboard" : "/employee/dashboard"} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const loggedInUser = await loginMutation.mutateAsync({ email, password });
      navigate(loggedInUser.role === "DEALER" ? "/dashboard" : "/employee/dashboard");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
            <Wallet className="h-6 w-6 text-secondary" />
          </div>
          <CardTitle className="text-2xl">
            Due<span className="text-secondary">Track</span>
          </CardTitle>
          <CardDescription>Sign in to manage your payment collections</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Demo credentials (development only)</p>
            <p>Dealer: dealer@example.com / password123</p>
            <p>Employee: employee@example.com / password123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
