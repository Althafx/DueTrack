import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useChangeMyPassword, useCurrentUser, useMyPassword } from "@/hooks/useAuth";
import { getErrorMessage } from "@/services/api";

export function MyAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: user } = useCurrentUser();
  const [revealPassword, setRevealPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const passwordQuery = useMyPassword(revealPassword);
  const changePasswordMutation = useChangeMyPassword();

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword.trim()) return;
    try {
      await changePasswordMutation.mutateAsync({ newPassword: newPassword.trim() });
      toast.success("Password updated");
      setNewPassword("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setRevealPassword(false);
          setNewPassword("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>My Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={user?.name ?? ""} readOnly disabled />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={user?.username ?? ""} readOnly disabled />
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <Label>Current Password</Label>
            {!revealPassword ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setRevealPassword(true)}>
                Show my password
              </Button>
            ) : passwordQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : (
              <PasswordInput readOnly value={passwordQuery.data ?? ""} />
            )}
          </div>

          <form onSubmit={handleChangePassword} className="space-y-2">
            <Label htmlFor="myNewPassword">Change Password</Label>
            <PasswordInput
              id="myNewPassword"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
            />
            <DialogFooter>
              <Button type="submit" disabled={changePasswordMutation.isPending || !newPassword.trim()}>
                {changePasswordMutation.isPending ? "Saving..." : "Save Password"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
