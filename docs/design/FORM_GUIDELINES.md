# OCTIEN Form Guidelines

Forms are where work happens in an ERP — they must feel effortless, fast, and forgiving. Built on
`ui/form` (react-hook-form + base-ui), composed via `EnterpriseForm`/field wrappers.

## Layout
- **Single column** by default — fastest to scan and complete. Two columns only for short, paired fields (city/postcode, qty/unit) at `md+`.
- Group related fields in **`EnterpriseSection`** with a short title + optional helper; separate groups with space, not heavy borders.
- Field vertical rhythm `space-y-4`; within a row `gap-3`. Max form width `max-w-2xl`–`max-w-3xl` (wizards/detail may be wider).
- **Sticky action bar** at the bottom for long forms: `Cancel` (ghost/secondary) + one `primary` submit; destructive separated left.

## Fields
- Every field: **label above** (`text-sm font-medium`) · control · helper (`text-xs text-muted-foreground`) · error slot. Never placeholder-as-label.
- Placeholder = example/format hint only (`e.g. INV-0001`), `text-muted-foreground`.
- Required marked with a subtle `*` and/or "Required"; prefer marking **optional** when most are required.
- Inputs: `rounded-md border-input bg-background`, `h-9` default, focus ring = `ring` (primary). Leading icon `left-3 size-4 text-muted-foreground`.
- Controls: text `Input`, choice `Select`/`Combobox`, boolean `Checkbox`/`Switch`, date `DatePicker`, long text `Textarea`. Money/qty inputs right-align, `tabular-nums`, with unit/₹ affix.
- Disabled/read-only states are visually distinct and never look "empty".

## Validation
- **Inline, on blur** for a field; **on submit** for the form. Never validate aggressively on every keystroke (except live constraints like max length).
- Error: `text-destructive text-xs` below the field + `aria-invalid` + `aria-describedby`. Field border → `destructive`.
- On submit failure: focus + scroll to the first error; summarize count if the form is long.
- Server/action errors surface as a form-level `EnterpriseToast` (transient) or an inline alert (persistent) — never a silent failure.
- Success: toast confirmation; navigate or reset per flow. Optimistic UI only where safe to roll back.

## Interaction & speed
- **Keyboard-first:** logical tab order, `Enter` submits single-primary forms, `Esc` cancels in dialogs, `Cmd/Ctrl+Enter` submits multi-line.
- Autofocus the first field (not in dialogs opened by keyboard where it steals context inappropriately).
- Preserve entered data on validation error and on accidental navigation (warn on dirty unsaved).
- Sensible defaults, remembered last-used values, and inline "create new" for reference selects (customer/supplier/account).

## Accessibility
Programmatic label association (`htmlFor`/`id`) · `fieldset`/`legend` for groups · errors linked via
`aria-describedby` · required via `aria-required` · focus-visible on every control · adequate 32px+
targets · works at 200% zoom and reduced-motion.

## Modals vs pages
- **Dialog form** (`EnterpriseModal`) for short, focused create/edit (≤ ~6 fields).
- **Full page** for complex records (orders, invoices with lines). Line-item editors use a compact
  editable table with add/remove rows, running totals (`tabular-nums`), and inline validation.

## Never
Placeholder-as-label · validation spam per keystroke · lost input on error · silent submit failures ·
two primary buttons · hardcoded field colors/sizes · non-keyboard-operable custom controls.
