import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { useEmployee } from "@/hooks/useEmployees";
import { formatCurrency } from "@/lib/formatters";

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useEmployee(id);

  if (isLoading || !data) {
    return <LoadingState label="Loading employee..." />;
  }

  const { employee, performance } = data;

  return (
    <div className="animate-page space-y-6">
      <div className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-2 pt-4 md:-mx-8 md:px-8 md:pt-8 lg:-mx-10 lg:px-10">
        <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Employees
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="text-2xl">{employee.name}</CardTitle>
            <Badge variant={employee.status === "ACTIVE" ? "success" : "muted"}>{employee.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{employee.email}</p>
          <p className="text-sm text-muted-foreground">{employee.phone}</p>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground">Total Assigned</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(performance.totalAssigned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground">Total Collected</p>
            <p className="mt-1 text-xl font-semibold text-success">{formatCurrency(performance.totalCollected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground">Pending</p>
            <p className="mt-1 text-xl font-semibold">{performance.pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground">Partially Collected</p>
            <p className="mt-1 text-xl font-semibold">{performance.partiallyCollectedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground">Completed</p>
            <p className="mt-1 text-xl font-semibold">{performance.completedCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
