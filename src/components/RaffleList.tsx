import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  Users, 
  DollarSign,
  ChevronRight,
  Archive,
  Share2,
  Ticket
} from "lucide-react";
import { Raffle } from "@/src/types";
import { api } from "@/src/services/api";
import { cn } from "@/src/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RaffleListProps {
  onSelectRaffle: (id: number) => void;
  onCreateRaffle: () => void;
}

export default function RaffleList({ onSelectRaffle, onCreateRaffle }: RaffleListProps) {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/raffles")
      .then(setRaffles)
      .finally(() => setLoading(false));
  }, []);

  const filteredRaffles = raffles.filter(r => {
    const matchesFilter = filter === "all" || r.status === filter;
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-gray-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-black">Mis Rifas</h2>
          <p className="text-gray-500 mt-1">Gestiona tus eventos activos y pasados.</p>
        </div>
        <button 
          onClick={onCreateRaffle}
          className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          <span>Nueva Rifa</span>
        </button>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por título..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
          />
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100">
          {["active", "closed", "archived", "all"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                filter === f ? "bg-black text-white" : "text-gray-400 hover:text-black"
              )}
            >
              {f === "active" ? "Activas" : f === "closed" ? "Cerradas" : f === "archived" ? "Archivadas" : "Todas"}
            </button>
          ))}
        </div>
      </div>

      {/* Raffle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRaffles.map((raffle) => (
          <div 
            key={raffle.id}
            onClick={() => onSelectRaffle(raffle.id)}
            className="group bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
          >
            {/* Status Badge */}
            <div className={cn(
              "absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
              raffle.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
            )}>
              {raffle.status}
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-black mb-2 group-hover:text-black transition-colors">{raffle.title}</h3>
              <div className="flex items-center text-gray-400 text-xs space-x-4">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>{format(new Date(raffle.draw_date), "d MMM, yyyy", { locale: es })}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <DollarSign size={14} />
                  <span>${raffle.ticket_price} {raffle.currency}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                <span>Progreso</span>
                <span className="text-black">65%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-black rounded-full" style={{ width: "65%" }} />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                    {i}
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400">
                  +12
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 transition-colors">
                  <Share2 size={18} />
                </button>
                <button className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 transition-colors">
                  <Archive size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredRaffles.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <Ticket size={40} className="text-gray-200" />
            </div>
            <h3 className="text-xl font-bold text-black">No se encontraron rifas</h3>
            <p className="text-gray-400 mt-2 max-w-xs">Comienza creando tu primera rifa para verla aquí.</p>
            <button 
              onClick={onCreateRaffle}
              className="mt-8 text-sm font-bold border-b-2 border-black pb-1 hover:opacity-70 transition-opacity"
            >
              Crear mi primera rifa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
