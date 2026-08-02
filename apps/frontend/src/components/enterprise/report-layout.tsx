import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EnterprisePage, EnterprisePageHeader, EnterpriseKPIRow, EnterpriseStatCard } from "@/components/enterprise/layout";
import { EnterprisePrintButton } from "@/components/enterprise/print-button";

/**
 * Standard report scaffold — header + print, an optional totals KPI row, and the report body.
 * Shared by every register/aggregate report so they all look and behave the same.
 */
export function EnterpriseReportLayout({
  title,
  description,
  backHref = "/sales/reports",
  backLabel = "Reports",
  kpis,
  actions,
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  kpis?: { label: string; value: string }[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <EnterprisePage>
      <EnterprisePageHeader
        title={title}
        description={description}
        actions={
          <div className="flex items-center gap-2">
            {actions}
            <EnterprisePrintButton />
            <Link href={backHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="h-4 w-4" /> {backLabel}
            </Link>
          </div>
        }
      />
      {kpis && kpis.length > 0 && (
        <EnterpriseKPIRow className={kpis.length >= 4 ? "lg:grid-cols-4" : undefined}>
          {kpis.map((k) => (
            <EnterpriseStatCard key={k.label} title={k.label} value={k.value} />
          ))}
        </EnterpriseKPIRow>
      )}
      {children}
    </EnterprisePage>
  );
}
