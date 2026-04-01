import React, { useState, useEffect } from "react";
import { api } from "@/src/services/api";
import { Raffle, User } from "@/src/types";
import { Calendar, DollarSign, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PublicProfileProps {
  slug: string;
}

export default function PublicProfile({ slug }: PublicProfileProps) {
  const [data, setData] = useState<{ user: User; raffles: Raffle[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [slug]);

  const fetchProfile = async () => {
    try {
      const result = await api.get(`/public/${slug}`);
      setData(result);
    } catch (err: any) {
      setError("Rifero no encontrado");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="w-12 h-1 bg-black/10 rounded-full overflow-hidden">
          <div className="h-full bg-black animate-[loading_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-4xl font-bold tracking-tighter mb-4">404</h2>
        <p className="text-gray-500 mb-8">{error}</p>
        <a href="/" className="px-8 py-4 bg-black text-white rounded-2xl font-bold">Volver al inicio</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans pb-20">
      {/* Header */}
      <div className="bg-black text-white pt-20 pb-32 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
            {data.user.business_name || data.user.name}
          </h1>
          <p className="text-gray-400 text-lg font-medium">Explora nuestras rifas activas y participa hoy mismo.</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 -mt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.raffles.map((raffle) => {
            const soldCount = (raffle as any).sold_count || 0;
            const progress = Math.round((soldCount / raffle.ticket_count) * 100);
            
            return (
              <a 
                key={raffle.id}
                href={`/${slug}/${raffle.short_id}`}
                className="group bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold tracking-tight group-hover:text-black transition-colors">{raffle.title}</h3>
                    <div className="flex items-center space-x-2 text-gray-400 text-sm font-medium">
                      <Calendar size={14} />
                      <span>{format(new Date(raffle.draw_date), "d 'de' MMMM", { locale: es })}</span>
                    </div>
                  </div>
                  <div className="bg-black text-white p-3 rounded-2xl group-hover:scale-110 transition-transform">
                    <ArrowRight size={20} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Costo del boleto</p>
                      <p className="text-3xl font-black tracking-tighter">${raffle.ticket_price} <span className="text-sm font-bold text-gray-400">{raffle.currency}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Vendido</p>
                      <p className="text-xl font-bold">{progress}%</p>
                    </div>
                  </div>

                  <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                    <div 
                      className="h-full bg-black transition-all duration-1000" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {data.raffles.length === 0 && (
          <div className="bg-white rounded-[2.5rem] p-20 text-center border border-gray-100">
            <p className="text-gray-400 font-medium">No hay rifas activas en este momento.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto px-6 mt-20 text-center">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Powered by Sorteo.uno</p>
      </div>
    </div>
  );
}
