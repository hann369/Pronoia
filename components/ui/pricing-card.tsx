"use client";

// Mobile subscription selector for the Pronoia Store, adapted from the
// "pricing-card" concept: animated radio cards with expanding feature lists.
// Removed vs. the source: billing-cycle toggle (no yearly Stripe prices yet)
// and the per-seat user stepper (no multi-seat plans). Icons: lucide.

import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";

export type MobilePlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  period: string;
  features: string[];
  ctaText: string;
};

interface PricingCardProps {
  plans: MobilePlan[];
  activePlanId?: string | null;
  busy?: boolean;
  onConfirm: (planId: string) => void;
  title?: string;
}

const TRANSITION = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

export default function PricingCard({
  plans,
  activePlanId = null,
  busy = false,
  onConfirm,
  title = "System-Level wählen",
}: PricingCardProps) {
  const [selectedPlan, setSelectedPlan] = useState(
    activePlanId || plans.find((p) => p.price > 0)?.id || plans[0]?.id
  );

  const selected = plans.find((p) => p.id === selectedPlan);

  return (
    <div className="w-full max-w-[450px] flex flex-col gap-5 p-5 rounded-2xl bg-card text-foreground">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>

      <div className="flex flex-col gap-3">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const isActive = activePlanId === plan.id;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className="relative cursor-pointer"
            >
              <div
                className={`relative rounded-xl bg-secondary border transition-colors duration-300 ${
                  isSelected ? "z-10 border-primary border-2" : "border-border"
                }`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="mt-1 shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            isSelected ? "border-primary" : "border-muted-foreground/30"
                          }`}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="w-3 h-3 rounded-full bg-primary"
                                transition={TRANSITION}
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-base font-medium leading-tight">
                          {plan.name}
                          {isActive && (
                            <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-primary">
                              Aktiv ✓
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium">
                        <NumberFlow
                          value={plan.price}
                          format={{ style: "currency", currency: "EUR", minimumFractionDigits: 0 }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground">{plan.period}</div>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                        className="overflow-hidden w-full"
                      >
                        <div className="pt-4 flex flex-col gap-2.5">
                          {plan.features.map((feature, idx) => (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05, duration: 0.3 }}
                              key={idx}
                              className="flex items-center gap-2.5 text-xs text-foreground/85"
                            >
                              <Check size={14} className="shrink-0 text-primary" />
                              {feature}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => selected && onConfirm(selected.id)}
        disabled={busy || !selected || activePlanId === selected.id}
        className="mt-1 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {busy
          ? "Wird geladen…"
          : activePlanId === selected?.id
            ? "Aktueller Plan"
            : selected?.ctaText || "Auswählen"}
      </button>
    </div>
  );
}
