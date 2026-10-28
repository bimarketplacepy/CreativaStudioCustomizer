/**
 * Formulario corto de «Comprar»: nombre, celular y email. Valida en el
 * navegador con las mismas reglas del servidor y, al confirmar, delega en
 * `onSubmit` (que crea el pedido en Odoo y manda al portal de pago).
 */
import React, { useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeEmail, normalizePhonePy } from "@/lib/phone-py";

export interface CheckoutCustomer { nombre: string; telefono: string; email: string }

/** Resultado de `onSubmit`: `null` = se fue al pago; con `message` = quedó un aviso. */
export interface CheckoutFailure {
  message: string;
  /** Campo inválido según el servidor. */
  field?: "telefono" | "email" | "nombre";
  /** Odoo no respondió: ofrecer seguir por WhatsApp. */
  whatsapp?: boolean;
  /** Pedido ya pagado: link para verlo. */
  viewUrl?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Total estimado ya formateado ("Gs. 210.000") y detalle de la pieza. */
  total: string | null;
  summary: string;
  onSubmit: (customer: CheckoutCustomer) => Promise<CheckoutFailure | null>;
  /** Fallback: enviar el mismo pedido por WhatsApp. */
  onWhatsApp: () => void;
}

const STORAGE_KEY = "cs.checkout.customer";

export function CheckoutDialog({ open, onOpenChange, total, summary, onSubmit, onWhatsApp }: Props) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutCustomer, string>>>({});
  const [failure, setFailure] = useState<CheckoutFailure | null>(null);
  const [busy, setBusy] = useState(false);

  // Recordar los datos en este navegador: al volver atrás desde el pago no
  // hay que tipearlos de nuevo (y el mismo requestId reutiliza el pedido).
  useEffect(() => {
    if (!open) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as CheckoutCustomer | null;
      if (saved) { setNombre(saved.nombre ?? ""); setTelefono(saved.telefono ?? ""); setEmail(saved.email ?? ""); }
    } catch { /* sin datos guardados */ }
    setFailure(null);
    setErrors({});
  }, [open]);

  const validate = (): CheckoutCustomer | null => {
    const e: typeof errors = {};
    const n = nombre.trim();
    if (n.length < 2) e.nombre = "Escribí tu nombre y apellido.";
    if (!normalizePhonePy(telefono)) e.telefono = "Ingresá un celular paraguayo válido (ej. 0981 123 456).";
    if (!normalizeEmail(email)) e.email = "Ingresá un email válido.";
    setErrors(e);
    if (Object.keys(e).length) return null;
    return { nombre: n, telefono: telefono.trim(), email: email.trim() };
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    const customer = validate();
    if (!customer) return;
    setBusy(true);
    setFailure(null);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(customer)); } catch { /* modo privado */ }
    try {
      const result = await onSubmit(customer);
      if (result) {
        setFailure(result);
        if (result.field) setErrors({ [result.field]: result.message });
      }
      // Sin resultado: la página ya está yendo al portal de pago.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={busy ? () => {} : onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-5 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="font-serif font-light text-2xl text-[var(--cs-ink)]">Comprar tu diseño</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {summary}{total ? ` · ${total}` : ""}. Después del pago te confirmamos el diseño final por WhatsApp antes de grabar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="co-nombre">Nombre y apellido</Label>
            <Input id="co-nombre" autoComplete="name" value={nombre} onChange={e => setNombre(e.target.value)}
              aria-invalid={!!errors.nombre} aria-describedby={errors.nombre ? "co-nombre-err" : undefined} className="min-h-11 text-base" />
            {errors.nombre && <p id="co-nombre-err" className="text-xs text-red-700">{errors.nombre}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="co-tel">Celular</Label>
            <Input id="co-tel" type="tel" inputMode="tel" autoComplete="tel" placeholder="0981 123 456" value={telefono} onChange={e => setTelefono(e.target.value)}
              aria-invalid={!!errors.telefono} aria-describedby={errors.telefono ? "co-tel-err" : undefined} className="min-h-11 text-base" />
            {errors.telefono && <p id="co-tel-err" className="text-xs text-red-700">{errors.telefono}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="co-email">Email</Label>
            <Input id="co-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
              aria-invalid={!!errors.email} aria-describedby={errors.email ? "co-email-err" : undefined} className="min-h-11 text-base" />
            {errors.email && <p id="co-email-err" className="text-xs text-red-700">{errors.email}</p>}
            <p className="text-xs text-muted-foreground">Ahí te llega el comprobante y el link para ver tu pedido.</p>
          </div>

          {failure && !failure.field && (
            <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 space-y-2">
              <p>{failure.message}</p>
              {failure.viewUrl && (
                <a className="cs-btn cs-btn-ghost cs-btn-sm" href={failure.viewUrl}>Ver mi pedido</a>
              )}
              {failure.whatsapp && (
                <button type="button" className="cs-btn cs-btn-ghost cs-btn-sm" onClick={() => { onOpenChange(false); onWhatsApp(); }}>
                  <MessageCircle className="w-4 h-4" /> Seguir por WhatsApp
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" className="cs-btn cs-btn-ghost" onClick={() => onOpenChange(false)} disabled={busy}>Volver</button>
            <button type="submit" className="cs-btn cs-btn-primary disabled:opacity-60" disabled={busy}>
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparando el pago…</> : "Ir a pagar"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
