import React, { useState, useEffect } from "react";
import { 
  Check, 
  Zap, 
  ShieldCheck, 
  Star, 
  CreditCard,
  ArrowRight,
  Info,
  Loader2,
  CheckCircle2,
  XCircle,
  PartyPopper
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { User } from "@/src/types";
import { api } from "@/src/services/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SubscriptionProps {
  user: User | null;
}

interface PromoResult {
  valid: boolean;
  type: string;
  original_price: number;
  discount_amount: number;
  final_price: number;
  plan_granted?: string;
  error?: string;
}

export default function Subscription({ user }: SubscriptionProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("annual");
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activatedPlanInfo, setActivatedPlanInfo] = useState<{ name: string, end: string } | null>(null);

  const handleValidatePromo = async () => {
    if (!promoCode) return;
    setIsValidating(true);
    setPromoResult(null);
    try {
      const result = await api.post("/promo/validate", { code: promoCode, plan_id: selectedPlan });
      setPromoResult(result);
    } catch (e: any) {
      setPromoResult({ valid: false, error: e.message || "Error al validar código", type: "", original_price: 0, discount_amount: 0, final_price: 0 });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRedeemPromo = async () => {
    if (!promoCode || !promoResult?.valid) return;
    setIsRedeeming(true);
    try {
      const result = await api.post("/promo/redeem", { code: promoCode, plan_id: selectedPlan });
      if (result.success && result.plan_activated) {
        const planName = plans.find(p => p.id === (promoResult.plan_granted || selectedPlan))?.name || "";
        setActivatedPlanInfo({ name: planName, end: result.subscription_end });
        setShowSuccessModal(true);
      }
    } catch (e: any) {
      alert(e.message || "Error al canjear código");
    } finally {
      setIsRedeeming(false);
    }
  };

  useEffect(() => {
    if (promoResult?.valid) {
      handleValidatePromo();
    }
  }, [selectedPlan]);

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
                {promoResult?.valid && selectedPlan === plan.id && promoResult.discount_amount > 0 ? (
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-400 line-through font-bold">{plan.price}</span>
                    <span className="text-3xl font-black tracking-tighter text-green-600">
                      ${promoResult.final_price}
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-black tracking-tighter">{plan.price}</span>
                )}
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

            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (promoResult?.valid && promoResult.type === 'free_plan' && selectedPlan === plan.id) {
                  handleRedeemPromo();
                }
              }}
              disabled={isRedeeming}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center space-x-2",
                plan.id === "annual" ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-800",
                isRedeeming && "opacity-50 cursor-not-allowed"
              )}
            >
              {isRedeeming && selectedPlan === plan.id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <span>
                  {plan.id === user?.plan ? "Plan Actual" : (
                    promoResult?.valid && promoResult.type === 'free_plan' && selectedPlan === plan.id 
                      ? "Activar gratis con código" 
                      : plan.button
                  )}
                </span>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
        <div className="p-6 bg-gray-50 rounded-[2rem]">
          <CreditCard size={48} className="text-black" />
        </div>
        <div className="flex-1 text-center md:text-left w-full">
          <h3 className="text-2xl font-bold tracking-tight mb-2">¿Tienes un código promocional?</h3>
          <p className="text-gray-500 text-sm mb-6">Canjea tu código para obtener descuentos exclusivos o períodos de prueba extendidos.</p>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidatePromo()}
                  placeholder="SORTEO2026"
                  disabled={isValidating}
                  className={cn(
                    "w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-mono font-bold outline-none",
                    promoResult?.valid ? "border-green-500 bg-green-50/30" : 
                    promoResult?.valid === false ? "border-red-500 bg-red-50/30" : "border-transparent"
                  )}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {promoResult?.valid && <CheckCircle2 className="text-green-500" size={20} />}
                  {promoResult?.valid === false && <XCircle className="text-red-500" size={20} />}
                </div>
              </div>
              <button 
                onClick={handleValidatePromo}
                disabled={isValidating || !promoCode}
                className="px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center min-w-[120px]"
              >
                {isValidating ? <Loader2 size={20} className="animate-spin" /> : "Canjea"}
              </button>
            </div>

            {promoResult?.valid && (
              <div className="flex items-center space-x-2 text-green-600 font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <PartyPopper size={16} />
                <span>🎉 Código aplicado! Ahorras ${promoResult.discount_amount} MXN</span>
              </div>
            )}

            {promoResult?.valid === false && (
              <div className="text-red-500 font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                {promoResult.error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && activatedPlanInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} strokeWidth={3} />
            </div>
            <h3 className="text-3xl font-black tracking-tighter mb-4">¡Plan Activado!</h3>
            <p className="text-gray-500 font-medium mb-8">
              Tu plan <span className="text-black font-bold">{activatedPlanInfo.name}</span> está activo hasta el <span className="text-black font-bold">{format(new Date(activatedPlanInfo.end), "d 'de' MMMM, yyyy", { locale: es })}</span>.
            </p>
            <button 
              onClick={() => window.location.href = "/dashboard"}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
            >
              Ir al Dashboard
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center space-x-8 opacity-40 grayscale">
        <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-8" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-6" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-8" />
      </div>
    </div>
  );
}
