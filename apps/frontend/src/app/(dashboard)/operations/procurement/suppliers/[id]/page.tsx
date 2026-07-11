import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addSupplierContact } from "@/app/actions/supplier";
import Link from "next/link";
import { ArrowLeft, UserPlus, CheckCircle } from "lucide-react";

export default async function ManageSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId } = await requireBusinessContext();

  const supplier = await db.supplier.findUnique({
    where: { id, businessId: currentBusinessId },
    include: {
      contacts: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!supplier) return <div>Supplier not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/operations/procurement/suppliers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{supplier.name}</h2>
          <p className="text-muted-foreground">{supplier.code}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplier.contacts.map(contact => (
                  <div key={contact.id} className="flex justify-between items-center p-4 border rounded shadow-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{contact.name}</h3>
                        {contact.isPrimary && (
                          <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            <CheckCircle className="h-3 w-3" /> Primary
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <p>{contact.email || "No email provided"}</p>
                        <p>{contact.phone || "No phone provided"}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {supplier.contacts.length === 0 && (
                  <div className="text-center p-8 text-gray-500 border rounded">
                    No contacts found. Please add a contact to begin purchasing.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await addSupplierContact(formData);
                }}
                className="space-y-4"
              >
                <input type="hidden" name="supplierId" value={supplier.id} />
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Name</label>
                  <input name="name" required placeholder="Full Name" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input name="email" type="email" placeholder="contact@supplier.com" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <input name="phone" placeholder="+1 234 567 8900" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input type="checkbox" id="isPrimary" name="isPrimary" className="h-4 w-4 rounded border-gray-300" />
                  <label htmlFor="isPrimary" className="text-sm font-medium leading-none">
                    Set as Primary Contact
                  </label>
                </div>

                <Button type="submit" className="w-full">
                  <UserPlus className="mr-2 h-4 w-4" /> Add Contact
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Supplier Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-500">Status</span>
                <span className="font-medium">{supplier.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-500">Risk Level</span>
                <span className="font-medium">{supplier.riskLevel}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-500">Payment Terms</span>
                <span className="font-medium">{supplier.paymentTerms || "N/A"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
