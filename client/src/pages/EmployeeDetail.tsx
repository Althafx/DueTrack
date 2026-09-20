import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { useEmployee } from "@/hooks/useEmployees";
import { formatCurrency } from "@/lib/formatters";

interface EmployeeNavState {
  employeeIds?: string[];
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, isLoading } = useEmployee(id);

  // The ordered list of employee IDs the user was browsing when they opened
  // this one — passed through Link state from the Employees page. Lets
  // prev/next step through that exact list. Absent on a direct visit/refresh.
  const employeeIds = (location.state as EmployeeNavState | null)?.employeeIds;

  const { currentIndex, prevId, nextId } = useMemo(() => {
    if (!employeeIds || !id) return { currentIndex: -1, prevId: undefined, nextId: undefined };
    const index = employeeIds.indexOf(id);
    if (index === -1) return { currentIndex: -1, prevId: undefined, nextId: undefined };
    return {
      currentIndex: index,
      prevId: index > 0 ? employeeIds[index - 1] : undefined,
      nextId: index < employeeIds.length - 1 ? employeeIds[index + 1] : undefined,
    };
  }, [employeeIds, id]);

  function goTo(targetId: string | undefined) {
    if (!targetId) return;
    navigate(`/employees/${targetId}`, { state: { employeeIds } });
  }

  if (isLoading || !data) {
    return <LoadingState label="Loading employee..." />;
  }

  const { employee, performance } = data;

  return (
    <div className="animate-page space-y-6">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 bg-background px-4 pb-2 pt-4 md:-mx-8 md:px-8 md:pt-8 lg:-mx-10 lg:px-10">
        <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Employees
        </Link>

        {currentIndex !== -1 && employeeIds && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {currentIndex + 1} of {employeeIds.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!prevId}
              onClick={() => goTo(prevId)}
              aria-label="Previous employee"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!nextId}
              onClick={() => goTo(nextId)}
              aria-label="Next employee"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 md:px-6 md:py-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground md:text-xl">{employee.name}</p>
          <p className="truncate text-xs text-muted-foreground md:text-sm">
            {employee.username} · {employee.phone}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4 lg:grid-cols-5">
        <Card>
          <CardContent className="p-3 md:pt-6">
            <p className="text-xs font-medium text-muted-foreground">Assigned</p>
            <p className="mt-1 text-sm font-semibold md:text-xl">{formatCurrency(performance.totalAssigned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:pt-6">
            <p className="text-xs font-medium text-muted-foreground">Collected</p>
            <p className="mt-1 text-sm font-semibold text-success md:text-xl">{formatCurrency(performance.totalCollected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:pt-6">
            <p className="text-xs font-medium text-muted-foreground">Pending</p>
            <p className="mt-1 text-sm font-semibold md:text-xl">{performance.pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:pt-6">
            <p className="text-xs font-medium text-muted-foreground">Partial</p>
            <p className="mt-1 text-sm font-semibold md:text-xl">{performance.partiallyCollectedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:pt-6">
            <p className="text-xs font-medium text-muted-foreground">Completed</p>
            <p className="mt-1 text-sm font-semibold md:text-xl">{performance.completedCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
