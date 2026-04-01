import React, { useState } from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Ticket, 
  Zap, 
  Calendar, 
  DollarSign, 
  Type,
  LayoutGrid,
  Shuffle,
  AlignLeft
} from "lucide-react";
import { api } from "@/src/services/api";
import { cn } from "@/src/lib/utils";

interface CreateRaffleProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreateRaffle({ onSuccess, onCancel }: CreateRaffleProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "simple" as "simple" | "opportunities",
    ticket_count: 100,
    opportunities_per_ticket: 1,
    distribution_type: "linear" as "linear" | "random",
    ticket_price: 100,
    currency: "MXN",
    draw_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post("/raffles", formData);
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Error al crear la rifa");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-20">
      <header className="flex items-center justify-between">
        <button onClick={onCancel} className="flex items-center space-x-2 text-gray-400 hover:text-black transition-colors font-medium">
          <ArrowLeft size={18} />
          <span>Cancelar</span>
        </button>
        <div className="flex space-x-2">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={cn(
                "w-10 h-1.5 rounded-full transition-all duration-500",
                step >= i ? "bg-black" : "bg-gray-200"
              )} 
            />
          ))}
        </div>
      </header>

      <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-gray-100 shadow-sm">
        {step === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tighter text-black mb-2">Tipo de Rifa</h2>
              <p className="text-gray-500">Selecciona cómo quieres que funcione tu sorteo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setFormData({ ...formData, type: "simple" })}
                className={cn(
                  "p-8 rounded-[2.5rem] border-2 text-left transition-all group",
                  formData.type === "simple" ? "border-black bg-black text-white" : "border-gray-100 hover:border-gray-200"
                )}
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", formData.type === "simple" ? "bg-white/10" : "bg-gray-50 group-hover:bg-gray-100")}>
                  <Ticket size={24} className={formData.type === "simple" ? "text-white" : "text-black"} />
                </div>
                <h3 className="text-xl font-bold mb-2">Rifa Simple</h3>
                <p className={cn("text-sm leading-relaxed", formData.type === "simple" ? "text-white/60" : "text-gray-400")}>
                  Un número por boleto. Ideal para sorteos rápidos y directos.
                </p>
              </button>

              <button
                onClick={() => setFormData({ ...formData, type: "opportunities" })}
                className={cn(
                  "p-8 rounded-[2.5rem] border-2 text-left transition-all group",
                  formData.type === "opportunities" ? "border-black bg-black text-white" : "border-gray-100 hover:border-gray-200"
                )}
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", formData.type === "opportunities" ? "bg-white/10" : "bg-gray-50 group-hover:bg-gray-100")}>
                  <Zap size={24} className={formData.type === "opportunities" ? "text-white" : "text-black"} />
                </div>
                <h3 className="text-xl font-bold mb-2">Oportunidades</h3>
                <p className={cn("text-sm leading-relaxed", formData.type === "opportunities" ? "text-white/60" : "text-gray-400")}>
                  Múltiples números por boleto. Aumenta la emoción y las ventas.
                </p>
              </button>
            </div>

            <button 
              onClick={nextStep}
              className="w-full py-5 bg-black text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
            >
              <span>Continuar</span>
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tighter text-black mb-2">Configuración</h2>
              <p className="text-gray-500">Define el universo de números y distribución.</p>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1 flex items-center">
                    <LayoutGrid size={12} className="mr-2" />
                    Número de Boletos
                  </label>
                  <input 
                    type="number" 
                    value={formData.ticket_count}
                    onChange={(e) => setFormData({...formData, ticket_count: parseInt(e.target.value)})}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-bold text-lg"
                  />
                </div>
                {formData.type === "opportunities" && (
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1 flex items-center">
                      <Zap size={12} className="mr-2" />
                      Oportunidades por Boleto
                    </label>
                    <input 
                      type="number" 
                      value={formData.opportunities_per_ticket}
                      onChange={(e) => setFormData({...formData, opportunities_per_ticket: parseInt(e.target.value)})}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-bold text-lg"
                    />
                  </div>
                )}
              </div>

              {formData.type === "opportunities" && (
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Distribución de Números</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setFormData({ ...formData, distribution_type: "linear" })}
                      className={cn(
                        "p-4 rounded-2xl border-2 flex items-center space-x-3 transition-all",
                        formData.distribution_type === "linear" ? "border-black bg-black text-white" : "border-gray-100 text-gray-400"
                      )}
                    >
                      <AlignLeft size={18} />
                      <span className="text-sm font-bold">Lineal</span>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, distribution_type: "random" })}
                      className={cn(
                        "p-4 rounded-2xl border-2 flex items-center space-x-3 transition-all",
                        formData.distribution_type === "random" ? "border-black bg-black text-white" : "border-gray-100 text-gray-400"
                      )}
                    >
                      <Shuffle size={18} />
                      <span className="text-sm font-bold">Aleatoria</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-xs text-gray-400 font-medium leading-relaxed">
                  <span className="font-bold text-black">Nota:</span> El universo total será de <span className="text-black font-bold">{formData.ticket_count * formData.opportunities_per_ticket}</span> números. 
                  Una vez creada la rifa, estos parámetros no podrán modificarse.
                </p>
              </div>
            </div>

            <div className="flex space-x-4">
              <button 
                onClick={prevStep}
                className="flex-1 py-5 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all"
              >
                Atrás
              </button>
              <button 
                onClick={nextStep}
                className="flex-[2] py-5 bg-black text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
              >
                <span>Siguiente</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tighter text-black mb-2">Detalles Finales</h2>
              <p className="text-gray-500">Personaliza la información pública de tu rifa.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Título de la Rifa</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-bold"
                  placeholder="Ej. Gran Rifa de Verano"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1 flex items-center">
                    <DollarSign size={12} className="mr-2" />
                    Costo por Boleto
                  </label>
                  <input 
                    type="number" 
                    value={formData.ticket_price}
                    onChange={(e) => setFormData({...formData, ticket_price: parseFloat(e.target.value)})}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1 flex items-center">
                    <Calendar size={12} className="mr-2" />
                    Fecha del Sorteo
                  </label>
                  <input 
                    type="date" 
                    value={formData.draw_date}
                    onChange={(e) => setFormData({...formData, draw_date: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Descripción y Premios</label>
                <textarea 
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all resize-none"
                  placeholder="Describe los premios y las reglas del sorteo..."
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button 
                onClick={prevStep}
                className="flex-1 py-5 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all"
              >
                Atrás
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] py-5 bg-black text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={20} />
                    <span>Crear Rifa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
