/**
 * Template registry — the engine's plug-in point.
 *
 * Adding a template = add a component + one entry here. Nothing in the data layer, the preview UI,
 * or existing templates changes. `renderInvoiceTemplate` is the single entry the UI calls.
 */
import type { InvoiceRenderProps, InvoiceTemplateId } from "./types";
import { StandardTemplate } from "./templates/standard-template";
import { CorporateTemplate } from "./templates/corporate-template";
import { MinimalTemplate } from "./templates/minimal-template";

export interface TemplateMeta {
  id: InvoiceTemplateId;
  label: string;
  description: string;
  Component: (props: InvoiceRenderProps) => React.JSX.Element;
}

export const INVOICE_TEMPLATES: TemplateMeta[] = [
  { id: "standard", label: "Standard", description: "Classic, balanced business invoice", Component: StandardTemplate },
  { id: "corporate", label: "Corporate", description: "Bold header band, prominent balance", Component: CorporateTemplate },
  { id: "minimal", label: "Custom / Minimal", description: "Understated, client-brandable base", Component: MinimalTemplate },
];

export const DEFAULT_TEMPLATE_ID: InvoiceTemplateId = "standard";

export function getTemplate(id: InvoiceTemplateId): TemplateMeta {
  return INVOICE_TEMPLATES.find((t) => t.id === id) ?? INVOICE_TEMPLATES[0];
}

export function renderInvoiceTemplate(id: InvoiceTemplateId, props: InvoiceRenderProps) {
  const { Component } = getTemplate(id);
  return <Component {...props} />;
}
