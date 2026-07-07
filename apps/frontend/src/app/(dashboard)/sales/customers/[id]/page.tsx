// @ts-nocheck
import Link from "next/link";
import { getCustomer } from "@/app/actions/customer";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function Customer360Page({ params }: { params: { id: string } }) {
  const customer = await getCustomer(params.id);
  
  if (!customer) {
    notFound();
  }

  // Calculate placeholder LTV (Lifetime Value) from fulfilled orders
  const ltv = customer.salesOrders.filter(so => so.status === "FULFILLED").reduce((acc, so) => acc + so.totalAmount, 0);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
        <Link href="/sales/customers" className="hover:underline">Customers</Link>
        <span>/</span>
        <span className="font-medium text-foreground">{customer.code}</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{customer.name}</h2>
          <div className="flex gap-2 mt-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-secondary text-secondary-foreground'}`}>
              Status: {customer.status}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${customer.creditStatus === 'GOOD' ? 'bg-blue-100 text-blue-800' : customer.creditStatus === 'HOLD' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
              Credit: {customer.creditStatus}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Lifetime Value (LTV)</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(ltv)}</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-md p-6 bg-card">
          <h3 className="font-medium text-lg mb-4">Contact Info</h3>
          {customer.contacts.length > 0 ? (
            <div className="space-y-2">
              {customer.contacts.map(c => (
                <div key={c.id}>
                  <div className="font-medium">{c.name} {c.isPrimary && <span className="text-xs bg-primary/10 text-primary px-1 py-0.5 rounded">Primary</span>}</div>
                  <div className="text-sm text-muted-foreground">{c.email} | {c.phone}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No contacts listed.</div>
          )}
        </div>
        <div className="border rounded-md p-6 bg-card">
          <h3 className="font-medium text-lg mb-4">Addresses</h3>
          {customer.addresses.length > 0 ? (
            <div className="space-y-2">
              {customer.addresses.map(a => (
                <div key={a.id}>
                  <div className="font-medium">{a.label} {a.isPrimary && <span className="text-xs bg-primary/10 text-primary px-1 py-0.5 rounded">Primary</span>}</div>
                  <div className="text-sm text-muted-foreground">{a.addressLine}</div>
                  <div className="text-sm text-muted-foreground">{a.city}, {a.state} {a.zipCode} {a.country}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No addresses listed.</div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="border rounded-md overflow-hidden">
          <div className="bg-muted p-3 border-b font-medium text-sm">Recent Quotations</div>
          <div className="p-0">
            {customer.quotations.length > 0 ? (
              <ul className="divide-y">
                {customer.quotations.map(q => (
                  <li key={q.id} className="p-3 text-sm flex justify-between items-center">
                    <div>
                      <div className="font-medium text-blue-600">{q.code}</div>
                      <div className="text-xs text-muted-foreground">{q.createdAt.toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div>{formatCurrency(q.totalAmount)}</div>
                      <span className="text-xs bg-secondary px-1 py-0.5 rounded">{q.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-sm text-muted-foreground text-center">No quotes found.</div>
            )}
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="bg-muted p-3 border-b font-medium text-sm">Recent Orders</div>
          <div className="p-0">
            {customer.salesOrders.length > 0 ? (
              <ul className="divide-y">
                {customer.salesOrders.map(o => (
                  <li key={o.id} className="p-3 text-sm flex justify-between items-center">
                    <div>
                      <div className="font-medium text-blue-600">{o.code}</div>
                      <div className="text-xs text-muted-foreground">{o.createdAt.toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div>{formatCurrency(o.totalAmount)}</div>
                      <span className="text-xs bg-secondary px-1 py-0.5 rounded">{o.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-sm text-muted-foreground text-center">No orders found.</div>
            )}
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="bg-muted p-3 border-b font-medium text-sm">Recent Returns</div>
          <div className="p-0">
            {customer.returns.length > 0 ? (
              <ul className="divide-y">
                {customer.returns.map(r => (
                  <li key={r.id} className="p-3 text-sm flex justify-between items-center">
                    <div>
                      <div className="font-medium text-blue-600">{r.code}</div>
                      <div className="text-xs text-muted-foreground">{r.createdAt.toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-secondary px-1 py-0.5 rounded">{r.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-sm text-muted-foreground text-center">No returns found.</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
