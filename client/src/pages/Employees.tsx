import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileCard, MobileCardHeader, MobileCardList, MobileCardRow } from "@/components/shared/MobileCard";
import { useConfirm } from "@/components/shared/ConfirmDialogProvider";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useCreateEmployee, useDeleteEmployee, useEmployees } from "@/hooks/useEmployees";
import { getErrorMessage } from "@/services/api";
import type { CreateEmployeeRequest, UserDTO } from "@shared/types";

const EMPTY_FORM: CreateEmployeeRequest = { name: "", phone: "", email: "", password: "" };

export default function Employees() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateEmployeeRequest>(EMPTY_FORM);
  const [search, setSearch] = useState("");

  const { data: employees, isLoading } = useEmployees();
  const createMutation = useCreateEmployee();
  const deleteMutation = useDeleteEmployee();
  const confirm = useConfirm();

  const visibleEmployees = useMemo(() => {
    if (!employees) return employees;
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.phone.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query)
    );
  }, [employees, search]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(form);
      toast.success("Employee added");
      setForm(EMPTY_FORM);
      setDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = await confirm({
      title: "Delete employee",
      description: `Delete ${name}? This cannot be undone.`,
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Employee deleted");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="animate-page space-y-6">
      <div className="sticky top-0 z-10 -mx-4 space-y-4 bg-background px-4 pb-4 pt-4 md:-mx-8 md:px-8 md:pt-8 lg:-mx-10 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Employees</h1>
            <p className="text-sm text-muted-foreground">Manage your collection team</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Employee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Saving..." : "Save Employee"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <LoadingState />
          ) : !visibleEmployees || visibleEmployees.length === 0 ? (
            <EmptyState icon={UserCog} title="No employees found" description="Add an employee to start assigning collections." />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <Link to={`/employees/${employee.id}`} className="font-medium hover:text-secondary">
                            {employee.name}
                          </Link>
                        </TableCell>
                        <TableCell>{employee.phone}</TableCell>
                        <TableCell className="text-muted-foreground">{employee.email}</TableCell>
                        <TableCell>
                          <Badge variant={employee.status === "ACTIVE" ? "success" : "muted"}>
                            {employee.status === "ACTIVE" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(employee.id, employee.name)}>
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <MobileCardList>
                {visibleEmployees.map((employee) => (
                  <EmployeeMobileCard key={employee.id} employee={employee} onDelete={handleDelete} />
                ))}
              </MobileCardList>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmployeeMobileCard({
  employee,
  onDelete,
}: {
  employee: UserDTO;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <MobileCard>
      <MobileCardHeader>
        <Link to={`/employees/${employee.id}`} className="font-semibold text-foreground hover:text-secondary">
          {employee.name}
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant={employee.status === "ACTIVE" ? "success" : "muted"}>
            {employee.status === "ACTIVE" ? "Active" : "Inactive"}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(employee.id, employee.name)}>
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      </MobileCardHeader>
      <div className="divide-y divide-border">
        <MobileCardRow label="Phone" value={employee.phone} />
        <MobileCardRow label="Email" value={employee.email} />
      </div>
    </MobileCard>
  );
}
