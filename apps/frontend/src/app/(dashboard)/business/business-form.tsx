"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBusiness, updateBusiness } from "@/app/actions/business";

export interface BusinessFormValues {
  id?: string;
  name?: string | null;
  legalName?: string | null;
  tagline?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  taxId?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  footerNote?: string | null;
  paymentInstructions?: string | null;
  logoUrl?: string | null;
}

const textareaCls =
  "w-full min-h-[72px] rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 dark:bg-input/30";

export function BusinessForm({ initial, mode }: { initial?: BusinessFormValues; mode: "create" | "edit" }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [logo, setLogo] = React.useState<string | null>(initial?.logoUrl ?? null);
  const [primary, setPrimary] = React.useState(initial?.primaryColor ?? "#1e293b");
  const [accent, setAccent] = React.useState(initial?.accentColor ?? "#0ea5e9");
  const [name, setName] = React.useState(initial?.name ?? "");

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast.error("Logo must be under 512 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (logo) fd.set("logoUrl", logo);
    setPending(true);
    try {
      if (mode === "create") {
        await createBusiness(fd); // redirects to settings on success
      } else if (initial?.id) {
        await updateBusiness(initial.id, fd);
        toast.success("Business updated");
        router.refresh();
      }
    } catch (err) {
      // Next redirect() throws a special error we must not swallow as a failure.
      if (err && typeof err === "object" && "digest" in err && String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      toast.error(err instanceof Error ? err.message : "Failed to save business");
    } finally {
      setPending(false);
    }
  }

  const monogram = (name || "CB").split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader><CardTitle className="text-base font-medium">Business Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Business Name *</Label>
              <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Salam Cola" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input id="legalName" name="legalName" defaultValue={initial?.legalName ?? ""} placeholder="Registered entity name" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" name="tagline" defaultValue={initial?.tagline ?? ""} placeholder="Short brand line" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Billing Email</Label>
              <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="addressLine">Registered Address</Label>
              <Input id="addressLine" name="addressLine" defaultValue={initial?.addressLine ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxId">Tax / GSTIN</Label>
              <Input id="taxId" name="taxId" defaultValue={initial?.taxId ?? ""} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-medium">Invoice Branding</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-8 w-10 rounded border border-input bg-transparent" aria-label="Primary color" />
                <Input name="primaryColor" value={primary} onChange={(e) => setPrimary(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-8 w-10 rounded border border-input bg-transparent" aria-label="Accent color" />
                <Input name="accentColor" value={accent} onChange={(e) => setAccent(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="logo">Company Logo (PNG/SVG, &lt; 512 KB)</Label>
              <Input id="logo" type="file" accept="image/*" onChange={onLogoChange} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="footerNote">Invoice Footer Note</Label>
              <textarea id="footerNote" name="footerNote" defaultValue={initial?.footerNote ?? ""} className={textareaCls} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="paymentInstructions">Payment Instructions</Label>
              <textarea id="paymentInstructions" name="paymentInstructions" defaultValue={initial?.paymentInstructions ?? ""} className={textareaCls} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : mode === "create" ? "Create Business" : "Save Changes"}</Button>
        </div>
      </div>

      {/* Live branding preview */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader><CardTitle className="text-base font-medium">Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center gap-3 p-4 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="logo" className="h-10 w-10 rounded bg-white/90 object-contain p-1" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-white/20 text-sm font-bold">{monogram}</div>
                )}
                <div>
                  <div className="text-sm font-semibold">{name || "Business Name"}</div>
                  <div className="text-xs opacity-90">{initial?.tagline ?? "Your tagline"}</div>
                </div>
              </div>
              <div className="p-4 text-xs text-muted-foreground">
                Invoices and documents for this business use these colors and logo.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
