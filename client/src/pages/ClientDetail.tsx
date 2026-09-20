import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CollectionProgress } from "@/components/shared/CollectionProgress";
import { MobileCard, MobileCardHeader, MobileCardList, MobileCardRow } from "@/components/shared/MobileCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useClient } from "@/hooks/useClients";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface ClientNavState {
  clientIds?: string[];
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, isLoading } = useClient(id);

  // The ordered list of client IDs the user was browsing when they opened
  // this one — passed through Link state from the Clients page. Lets
  // prev/next step through that exact list. Absent on a direct visit/refresh.
  const clientIds = (location.state as ClientNavState | null)?.clientIds;

  const { currentIndex, prevId, nextId } = useMemo(() => {
    if (!clientIds || !id) return { currentIndex: -1, prevId: undefined, nextId: undefined };
    const index = clientIds.indexOf(id);
    if (index === -1) return { currentIndex: -1, prevId: undefined, nextId: undefined };
    return {
      currentIndex: index,
      prevId: index > 0 ? clientIds[index - 1] : undefined,
      nextId: index < clientIds.length - 1 ? clientIds[index + 1] : undefined,
    };
  }, [clientIds, id]);

  function goTo(targetId: string | undefined) {
    if (!targetId) return;
    navigate(`/clients/${targetId}`, { state: { clientIds } });
  }

  if (isLoading || !data) {
    return <LoadingState label="Loading client..." />;
  }

  const { client, collections } = data;

  return (
    <div className="animate-page space-y-6">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 bg-background px-4 pb-2 pt-4 md:-mx-8 md:px-8 md:pt-8 lg:-mx-10 lg:px-10">
        <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>

        {currentIndex !== -1 && clientIds && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {currentIndex + 1} of {clientIds.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!prevId}
              onClick={() => goTo(prevId)}
              aria-label="Previous client"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!nextId}
              onClick={() => goTo(nextId)}
              aria-label="Next client"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{client.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{client.phone}</p>
          <p className="text-sm text-muted-foreground">{client.address}</p>
          {client.notes && <p className="text-sm text-muted-foreground">Notes: {client.notes}</p>}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Due</p>
            <p className="text-xl font-semibold">{formatCurrency(client.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Received</p>
            <p className="text-xl font-semibold text-success">{formatCurrency(client.receivedAmount)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Remaining</p>
            <p className="text-xl font-semibold text-warning">{formatCurrency(client.remainingAmount)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collection History</CardTitle>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <EmptyState title="No collections yet" />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link to={`/collections/${c.id}`} className="font-medium hover:text-secondary">
                            {c.assignedEmployee.name}
                          </Link>
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <CollectionProgress received={c.receivedAmount} total={c.totalAmount} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(c.dueDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <MobileCardList>
                {collections.map((c) => (
                  <Link key={c.id} to={`/collections/${c.id}`}>
                    <MobileCard interactive>
                      <MobileCardHeader>
                        <p className="font-semibold text-foreground">{c.assignedEmployee.name}</p>
                        <StatusBadge status={c.status} />
                      </MobileCardHeader>
                      <CollectionProgress received={c.receivedAmount} total={c.totalAmount} className="mb-3" />
                      <MobileCardRow label="Due Date" value={formatDate(c.dueDate)} />
                    </MobileCard>
                  </Link>
                ))}
              </MobileCardList>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
