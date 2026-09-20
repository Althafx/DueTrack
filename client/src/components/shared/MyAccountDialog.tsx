import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, ShieldPlus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/shared/ConfirmDialogProvider";
import {
  useChangeMyPassword,
  useCreateDealer,
  useCurrentUser,
  useDealers,
  useDeleteDealer,
  useMyPassword,
  useUpdateMe,
} from "@/hooks/useAuth";
import { getErrorMessage } from "@/services/api";
import type { CreateDealerRequest } from "@shared/types";

export function MyAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: user } = useCurrentUser();
  const [revealPassword, setRevealPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [createDealerOpen, setCreateDealerOpen] = useState(false);

  const passwordQuery = useMyPassword(revealPassword);
  const changePasswordMutation = useChangeMyPassword();
  const updateMeMutation = useUpdateMe();
  const dealersQuery = useDealers(open && user?.role === "DEALER");
  const deleteDealerMutation = useDeleteDealer();
  const confirm = useConfirm();

  useEffect(() => {
    if (open) {
      setName(user?.name ?? "");
      setUsername(user?.username ?? "");
    }
  }, [open, user?.name, user?.username]);

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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;
    try {
      await updateMeMutation.mutateAsync({ name: name.trim(), username: username.trim() });
      toast.success("Account updated");
      setEditingProfile(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function cancelEditProfile() {
    setEditingProfile(false);
    setName(user?.name ?? "");
    setUsername(user?.username ?? "");
  }

  async function handleDeleteDealer(id: string, dealerName: string) {
    const confirmed = await confirm({
      title: "Delete admin",
      description: `Delete ${dealerName}'s admin account? This cannot be undone.`,
    });
    if (!confirmed) return;
    try {
      await deleteDealerMutation.mutateAsync(id);
      toast.success("Admin deleted");
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
          cancelEditProfile();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>My Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              {editingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="accountName" className="text-xs text-muted-foreground">
                        Name
                      </Label>
                      <Input
                        id="accountName"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-8"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="accountUsername" className="text-xs text-muted-foreground">
                        Username
                      </Label>
                      <Input
                        id="accountUsername"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-8"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-8" onClick={cancelEditProfile}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="h-8" disabled={updateMeMutation.isPending}>
                      {updateMeMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{user?.name}</p>
                    <p className="truncate text-sm text-muted-foreground">@{user?.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(true)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Edit account details"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-muted-foreground">Current Password</Label>
              {!revealPassword && (
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setRevealPassword(true)}>
                  <Eye className="h-3.5 w-3.5" /> Reveal
                </Button>
              )}
            </div>
            {revealPassword &&
              (passwordQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading...</p>
              ) : (
                <PasswordInput readOnly value={passwordQuery.data ?? ""} />
              ))}
          </div>

          <form onSubmit={handleChangePassword} className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="myNewPassword">Change Password</Label>
            <PasswordInput
              id="myNewPassword"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
            />
            <DialogFooter className="pt-1">
              <Button type="submit" disabled={changePasswordMutation.isPending || !newPassword.trim()}>
                {changePasswordMutation.isPending ? "Saving..." : "Save Password"}
              </Button>
            </DialogFooter>
          </form>

          {user?.role === "DEALER" && (
            <div className="space-y-3 border-t border-border pt-4">
              <Label className="text-muted-foreground">Admins</Label>
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {dealersQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : (
                  dealersQuery.data?.dealers.map((dealer) => (
                    <div
                      key={dealer.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="truncate font-medium text-foreground">{dealer.name}</span>{" "}
                        <span className="truncate text-xs text-muted-foreground">@{dealer.username}</span>
                      </div>
                      {dealersQuery.data?.isMainDealer && dealer.id !== user.id && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={deleteDealerMutation.isPending}
                          onClick={() => handleDeleteDealer(dealer.id, dealer.name)}
                          aria-label={`Delete ${dealer.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
              {dealersQuery.data?.isMainDealer && (
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setCreateDealerOpen(true)}>
                  <ShieldPlus className="h-4 w-4" /> Create New Admin
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      <CreateDealerDialog open={createDealerOpen} onOpenChange={setCreateDealerOpen} />
    </Dialog>
  );
}

const EMPTY_DEALER_FORM: CreateDealerRequest = { name: "", phone: "", username: "", password: "" };

function CreateDealerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [form, setForm] = useState<CreateDealerRequest>(EMPTY_DEALER_FORM);
  const createDealerMutation = useCreateDealer();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createDealerMutation.mutateAsync(form);
      toast.success("Admin account created");
      setForm(EMPTY_DEALER_FORM);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setForm(EMPTY_DEALER_FORM);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Admin</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This account will have full dealer-level access, including managing employees, clients, and collections.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newAdminName">Name</Label>
              <Input
                id="newAdminName"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newAdminPhone">Phone</Label>
              <Input
                id="newAdminPhone"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="newAdminUsername">Username</Label>
            <Input
              id="newAdminUsername"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newAdminPassword">Password</Label>
            <PasswordInput
              id="newAdminPassword"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createDealerMutation.isPending}>
              {createDealerMutation.isPending ? "Creating..." : "Create Admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
