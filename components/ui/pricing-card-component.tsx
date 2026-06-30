"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import NumberFlow from "@number-flow/react";

/* ============================= */
/* Types                         */
/* ============================= */

type Plan = {
  id?: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  description?: string;
  buttonText: string;
  href?: string;
  isPopular: boolean;
};

interface Props {
  plans: Plan[];
  heading?: string;
  subheading?: string;
  activePlanId?: string | null;
  busy?: boolean;
  onConfirm?: (planId: string) => void;
}

/* ============================= */
/* Component                     */
/* ============================= */
/* Calm macOS pricing cards. Colors come from CSS variables (the same      */
/* tokens the rest of the app uses) so they adapt to the black/white os     */
/* palette and noir automatically — single cobalt accent, no rainbow.       */

export default function PricingCardComponent({
  plans,
  heading = "Pricing Made Simple",
  subheading = "Pick a plan that matches your needs.",
  activePlanId = null,
  busy = false,
  onConfirm,
}: Props) {
  return (
    <section className="container py-16">
      <div className="mb-12 text-center space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
          {heading}
        </h2>
        <p className="text-sm" style={{ color: "var(--text2)" }}>
          {subheading}
        </p>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-stretch justify-center gap-5 md:flex-row">
        {plans.map((plan, idx) => {
          const isActive = activePlanId === plan.id;

          const btnBase: React.CSSProperties = {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            marginTop: "1rem",
            height: 40,
            borderRadius: 10,
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: busy || isActive ? "not-allowed" : "pointer",
            transition: "background 0.18s ease, border-color 0.18s ease",
          };
          const btnStyle: React.CSSProperties = plan.isPopular
            ? { ...btnBase, background: "var(--theme-accent)", border: "1px solid var(--theme-accent)", color: "#fff", opacity: isActive ? 0.5 : 1 }
            : { ...btnBase, background: "transparent", border: "1px solid var(--border-strong)", color: "var(--text)", opacity: isActive ? 0.5 : 1 };

          const label = busy ? "Wird geladen…" : isActive ? "Aktueller Plan" : plan.buttonText;

          return (
            <div
              key={plan.id || idx}
              className="relative flex w-full flex-col gap-3 rounded-2xl p-6 transition-colors duration-200 md:w-[320px]"
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${plan.isPopular ? "var(--theme-accent)" : "var(--border)"}`,
                boxShadow: plan.isPopular ? "var(--shadow-md)" : "var(--shadow-sm)",
                color: "var(--text)",
              }}
            >
              {plan.isPopular && (
                <span
                  className="absolute -top-2.5 left-6 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{ background: "var(--theme-accent)", color: "#fff" }}
                >
                  <Star className="h-3 w-3 fill-current" /> Beliebt
                </span>
              )}

              <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                {plan.name}
              </h3>

              {plan.description && (
                <p className="text-sm" style={{ color: "var(--text2)", minHeight: 36 }}>
                  {plan.description}
                </p>
              )}

              <div className="flex items-end gap-1">
                <NumberFlow
                  value={Number(plan.price)}
                  format={{ style: "currency", currency: "EUR", minimumFractionDigits: 0 }}
                  className="text-4xl font-semibold tracking-tight"
                  style={{ color: "var(--text)" }}
                />
                <span className="mb-1.5 text-sm" style={{ color: "var(--text2)" }}>
                  / {plan.period === "monthly" ? "Monat" : plan.period}
                </span>
              </div>

              <hr className="my-1" style={{ borderColor: "var(--border)", borderTopWidth: 1 }} />

              <ul className="flex flex-1 flex-col gap-2 text-sm">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2" style={{ color: "var(--text2)" }}>
                    <Check className="h-4 w-4 shrink-0" style={{ color: "var(--theme-accent)" }} /> {f}
                  </li>
                ))}
              </ul>

              {onConfirm ? (
                <button disabled={busy || isActive} onClick={() => onConfirm(plan.id!)} style={btnStyle}>
                  {label}
                </button>
              ) : (
                <Link href={plan.href ?? "#"} style={btnStyle}>
                  {plan.buttonText}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
