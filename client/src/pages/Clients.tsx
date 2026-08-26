import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Trash2, UserSquare2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileCard, MobileCardHeader, MobileCardList, MobileCardRow } from "@/components/shared/MobileCard";
import { useConfirm } from "@/components/shared/ConfirmDialogProvider";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useClients, useCreateClient, useDeleteClient } from "@/hooks/useClients";
import { getErrorMessage } from "@/services/api";
import { formatDate } from "@/lib/formatters";
import type { CreateClientRequest } from "@shared/types";

const EMPTY_FORM: CreateClientRequest = { name: "", phone: "", address: "", notes: "" };

export default function Clients() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateClientRequest>(EMPTY_FORM);

  const { data: clients, isLoading } = useClients(search);
  const createMutation = useCreateClient();
  const deleteMutation = useDeleteClient();
  const confirm = useConfirm();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(form);
      toast.success("Client added");
      setForm(EMPTY_FORM);
      setDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = await confirm({
      title: "Delete client",
      description: `Delete ${name}? This cannot be undone.`,
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Client deleted");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="animate-page space-y-6">
      <div className="sticky top-0 z-10 -mx-4 space-y-4 bg-background px-4 pb-4 pt-4 md:-mx-8 md:px-8 md:pt-8 lg:-mx-10 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Clients</h1>
            <p className="text-sm text-muted-foreground">Manage your client directory</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Saving..." : "Save Client"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <LoadingState />
          ) : !clients || clients.length === 0 ? (
            <EmptyState icon={UserSquare2} title="No clients found" description="Add a client to start creating collections." />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <Link to={`/clients/${client.id}`} className="font-medium hover:text-secondary">
                            {client.name}
                          </Link>
                        </TableCell>
                        <TableCell>{client.phone}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{client.address}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(client.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id, client.name)}>
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <MobileCardList>
                {clients.map((client) => (
                  <MobileCard key={client.id}>
                    <MobileCardHeader>
                      <Link to={`/clients/${client.id}`} className="font-semibold text-foreground hover:text-secondary">
                        {client.name}
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleDelete(client.id, client.name)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </MobileCardHeader>
                    <div className="divide-y divide-border">
                      <MobileCardRow label="Phone" value={client.phone} />
                      <MobileCardRow label="Address" value={client.address} />
                      <MobileCardRow label="Added" value={formatDate(client.createdAt)} />
                    </div>
                  </MobileCard>
                ))}
              </MobileCardList>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
