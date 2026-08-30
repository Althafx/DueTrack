import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CollectionProgress } from "@/components/shared/CollectionProgress";
import { MobileCard, MobileCardHeader, MobileCardList, MobileCardRow } from "@/components/shared/MobileCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useClient } from "@/hooks/useClients";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useClient(id);

  if (isLoading || !data) {
    return <LoadingState label="Loading client..." />;
  }

  const { client, collections } = data;

  return (
    <div className="animate-page space-y-6">
      <div className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-2 pt-4 md:-mx-8 md:px-8 md:pt-8 lg:-mx-10 lg:px-10">
        <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>
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
