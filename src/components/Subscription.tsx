import React, { useState } from "react";
import { 
  Check, 
  Zap, 
  ShieldCheck, 
  Star, 
  CreditCard,
  ArrowRight,
  Info
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { User } from "@/src/types";

interface SubscriptionProps {
  user: User | null;
}

export default function Subscription({ user }: SubscriptionProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("annual");

  const plans = [
    {
      id: "trial",
      name: "Trial",
      price: "Gratis",
      period: "Por siempre",
      features: ["1 Rifa activa", "Límite de boletos", "Ticket digital", "Soporte básico"],
      color: "bg-gray-50 text-gray-600",
      button: "Plan Actual"
    },
    {
      id: "3m",
      name: "3 Meses",
      price: "$299",
      period: "Trimestral",
      features: ["Rifas ilimitadas", "WhatsApp Deep Link", "Ticket digital", "Soporte prioritario"],
      color: "bg-white text-black border border-gray-100",
      button: "Seleccionar"
    },
    {
      id: "6m",
      name: "6 Meses",
      price: "$499",
      period: "Semestral",
      features: ["Rifas ilimitadas", "WhatsApp Deep Link", "Códigos promocionales", "Soporte prioritario"],
      color: "bg-white text-black border border-gray-100",
      button: "Seleccionar",
      badge: "+20% valor"
    },
    {
      id: "annual",
      name: "Anual",
      price: "$799",
      period: "Anual",
      features: ["Rifas ilimitadas", "WhatsApp Deep Link", "Códigos promocionales", "Soporte 24/7 VIP"],
      color: "bg-black text-white",
      button: "Mejor Valor",
      badge: "★ Recomendado"
    }
  ];

  return (
    <div className="space-y-12 pb-20">
      <header className="text-center max-w-2xl mx-auto">
        <h2 className="text-4xl font-black tracking-tighter text-black mb-4">Planes y Suscripción</h2>
        <p className="text-gray-500 text-lg font-medium">
          Elige el plan que mejor se adapte a tus necesidades. Escala tu negocio con Sorteo. {/* renamed: KOUUN → Sorteo */}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={cn(
              "p-8 rounded-[2.5rem] flex flex-col transition-all duration-300 cursor-pointer relative",
              plan.color,
              selectedPlan === plan.id ? "ring-4 ring-black/5 scale-105 shadow-2xl" : "hover:scale-102"
            )}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full border-2 border-white">
                {plan.badge}
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-black tracking-tighter">{plan.price}</span>
                <span className="text-xs opacity-60 font-bold uppercase tracking-widest">/ {plan.period}</span>
              </div>
            </div>

            <ul className="flex-1 space-y-4 mb-10">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start space-x-3 text-sm font-medium">
                  <div className={cn("mt-0.5 p-0.5 rounded-full", plan.id === "annual" ? "bg-white/20" : "bg-black/5")}>
                    <Check size={12} />
                  </div>
                  <span className="opacity-80">{feature}</span>
                </li>
              ))}
            </ul>

            <button className={cn(
              "w-full py-4 rounded-2xl font-bold text-sm transition-all",
              plan.id === "annual" ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-800"
            )}>
              {plan.id === user?.plan ? "Plan Actual" : plan.button}
            </button>
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
        <div className="p-6 bg-gray-50 rounded-[2rem]">
          <CreditCard size={48} className="text-black" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-2xl font-bold tracking-tight mb-2">¿Tienes un código promocional?</h3>
          <p className="text-gray-500 text-sm mb-6">Canjea tu código para obtener descuentos exclusivos o períodos de prueba extendidos.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              type="text" 
              placeholder="Sorteo-2026" // renamed: KOUUN → Sorteo
              className="flex-1 px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-mono font-bold"
            />
            <button className="px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all">
              Canjear
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-8 opacity-40 grayscale">
        <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-8" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-6" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-8" />
      </div>
    </div>
  );
}
