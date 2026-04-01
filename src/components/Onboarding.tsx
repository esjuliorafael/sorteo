import React, { useState } from "react";
import { 
  ArrowRight, 
  ChevronRight, 
  X, 
  Check, 
  Zap, 
  ShieldCheck, 
  Users, 
  MessageCircle,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/src/lib/utils";

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Gestión Caótica",
      description: "Olvídate de las hojas de cálculo y los grupos de WhatsApp. Kouun centraliza todo en un solo lugar.",
      icon: X,
      color: "bg-red-50 text-red-500",
      illustration: (
        <div className="relative w-full h-64 bg-gray-50 rounded-[3rem] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="relative space-y-4 w-full max-w-xs p-8">
            <div className="h-4 bg-gray-200 rounded-full w-3/4" />
            <div className="h-4 bg-gray-200 rounded-full w-1/2" />
            <div className="h-4 bg-gray-200 rounded-full w-2/3" />
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-red-100 rounded-full flex items-center justify-center rotate-12">
              <X size={40} className="text-red-500" />
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Todo en Uno",
      description: "Crea eventos, registra participantes, confirma pagos y envía recordatorios automáticos.",
      icon: LayoutDashboard,
      color: "bg-black text-white",
      illustration: (
        <div className="relative w-full h-64 bg-black rounded-[3rem] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="relative grid grid-cols-2 gap-4 w-full max-w-xs p-8">
            <div className="h-16 bg-white/10 rounded-2xl" />
            <div className="h-16 bg-white/10 rounded-2xl" />
            <div className="h-16 bg-white/10 rounded-2xl" />
            <div className="h-16 bg-white/10 rounded-2xl" />
          </div>
        </div>
      )
    },
    {
      title: "Recordatorios WhatsApp",
      description: "Envía comprobantes y recordatorios de pago directamente a sus chats sin complicaciones.",
      icon: MessageCircle,
      color: "bg-green-50 text-green-600",
      illustration: (
        <div className="relative w-full h-64 bg-green-50 rounded-[3rem] flex items-center justify-center overflow-hidden">
          <div className="relative space-y-4 w-full max-w-xs p-8">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[80%]">
              <div className="h-2 bg-gray-100 rounded-full w-full mb-2" />
              <div className="h-2 bg-gray-100 rounded-full w-2/3" />
            </div>
            <div className="bg-green-500 p-4 rounded-2xl rounded-tr-none shadow-sm max-w-[80%] ml-auto">
              <div className="h-2 bg-white/20 rounded-full w-full mb-2" />
              <div className="h-2 bg-white/20 rounded-full w-1/2" />
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Modelos de Rifa",
      description: "Soporte para rifas simples o con múltiples oportunidades por boleto. Tú decides cómo ganar.",
      icon: Zap,
      color: "bg-orange-50 text-orange-600",
      illustration: (
        <div className="relative w-full h-64 bg-orange-50 rounded-[3rem] flex items-center justify-center overflow-hidden">
          <div className="relative flex space-x-4 p-8">
            <div className="w-24 h-32 bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center p-4">
              <div className="w-8 h-8 bg-orange-100 rounded-full mb-2" />
              <div className="h-1 bg-gray-100 rounded-full w-full" />
            </div>
            <div className="w-24 h-32 bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center p-4 scale-110 border-2 border-orange-500">
              <div className="w-8 h-8 bg-orange-500 rounded-full mb-2" />
              <div className="h-1 bg-gray-100 rounded-full w-full" />
            </div>
            <div className="w-24 h-32 bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center p-4">
              <div className="w-8 h-8 bg-orange-100 rounded-full mb-2" />
              <div className="h-1 bg-gray-100 rounded-full w-full" />
            </div>
          </div>
        </div>
      )
    }
  ];

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-white z-[200] flex flex-col font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-20 max-w-4xl mx-auto w-full">
        <div className="w-full mb-12 animate-in fade-in zoom-in duration-700">
          {step.illustration}
        </div>

        <div className="text-center space-y-6 max-w-lg">
          <div className={cn("w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-8 animate-in slide-in-from-bottom-4 duration-500", step.color)}>
            <step.icon size={32} />
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-black animate-in slide-in-from-bottom-6 duration-500">
            {step.title}
          </h2>
          <p className="text-xl text-gray-500 font-medium leading-relaxed animate-in slide-in-from-bottom-8 duration-500">
            {step.description}
          </p>
        </div>
      </div>

      <div className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 max-w-7xl mx-auto w-full">
        <div className="flex space-x-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                currentStep === i ? "w-12 bg-black" : "w-2 bg-gray-200"
              )} 
            />
          ))}
        </div>

        <div className="flex items-center space-x-6">
          <button 
            onClick={onComplete}
            className="text-sm font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
          >
            Saltar
          </button>
          <button 
            onClick={next}
            className="px-10 py-5 bg-black text-white rounded-[2rem] font-bold text-lg flex items-center space-x-3 hover:bg-gray-800 transition-all shadow-2xl shadow-black/20"
          >
            <span>{currentStep === steps.length - 1 ? "Comenzar" : "Siguiente"}</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
