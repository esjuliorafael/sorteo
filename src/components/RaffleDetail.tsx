import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  DollarSign, 
  Calendar, 
  Share2, 
  Download,
  CheckCircle2,
  Clock,
  Trash2,
  MessageCircle,
  Search
} from "lucide-react";
import { Raffle, Ticket, User } from "@/src/types";
import { api } from "@/src/services/api";
import { cn } from "@/src/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { buildWhatsAppUrl } from "@/src/lib/whatsapp";
import { toPng } from "html-to-image";
import TicketCard from "./TicketCard";
import { useRef } from "react";

interface RaffleDetailProps {
  raffleId: number;
  user: User | null;
  onBack: () => void;
}

export default function RaffleDetail({ raffleId, user, onBack }: RaffleDetailProps) {
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [ticketToDownload, setTicketToDownload] = useState<Ticket | null>(null);
  const [searchTicket, setSearchTicket] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reserveForm, setReserveForm] = useState({ name: "", whatsapp: "" });
  
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRaffle();
  }, [raffleId]);

  const fetchRaffle = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/raffles/${raffleId}`);
      setRaffle(data);
    } finally {
      setLoading(false);
    }
  };

  const downloadTicket = async (ticket: Ticket) => {
    if (!raffle) return;
    
    setIsDownloading(true);
    setTicketToDownload(ticket);
    
    // Wait for the TicketCard to render in the hidden div
    setTimeout(async () => {
      if (ticketRef.current) {
        try {
          const dataUrl = await toPng(ticketRef.current, { 
            pixelRatio: 2,
            quality: 1,
            backgroundColor: "#ffffff"
          });
          
          const link = document.createElement("a");
          link.download = `ticket-${ticket.number}-${ticket.participant_name?.replace(/\s+/g, "-").toLowerCase()}.png`;
          link.href = dataUrl;
          link.click();
        } catch (err) {
          console.error("Error generating ticket image:", err);
          alert("Error al generar el ticket digital");
        } finally {
          setIsDownloading(false);
          setTicketToDownload(null);
        }
      }
    }, 500); // Small delay to ensure rendering
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      const response = await api.post(`/tickets/${selectedTicket.id}/reserve`, reserveForm);
      setIsReserveModalOpen(false);
      setReserveForm({ name: "", whatsapp: "" });
      setSelectedTicket(null);
      
      // Fetch updated raffle to get the reserved ticket data
      const updatedRaffle = await api.get(`/raffles/${raffleId}`);
      setRaffle(updatedRaffle);
      
      // Find the newly reserved ticket and download it
      const reservedTicket = updatedRaffle.tickets?.find((t: Ticket) => t.id === selectedTicket.id);
      if (reservedTicket) {
        downloadTicket(reservedTicket);
      }
    } catch (err) {
      alert("Error al apartar boleto");
    }
  };

  const handleMarkPaid = async (ticketId: number) => {
    try {
      await api.post(`/tickets/${ticketId}/pay`, {});
      fetchRaffle();
    } catch (err) {
      alert("Error al marcar como pagado");
    }
  };

  const handleDeleteReservation = async (ticketId: number) => {
    if (!confirm("¿Eliminar este apartado?")) return;
    try {
      await api.delete(`/tickets/${ticketId}`);
      fetchRaffle();
    } catch (err) {
      alert("Error al eliminar apartado");
    }
  };

  if (loading || !raffle) {
    return <div className="animate-pulse space-y-8">
      <div className="h-10 w-32 bg-gray-200 rounded-xl" />
      <div className="h-64 bg-white rounded-[2.5rem]" />
      <div className="grid grid-cols-10 gap-2">
        {Array.from({ length: 100 }).map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-lg" />)}
      </div>
    </div>;
  }

  const tickets = raffle.tickets || [];
  const paidCount = tickets.filter(t => t.status === "paid").length;
  const reservedCount = tickets.filter(t => t.status === "reserved").length;
  const availableCount = tickets.filter(t => t.status === "available").length;

  return (
    <div className="space-y-10 pb-20">
      <button onClick={onBack} className="flex items-center space-x-2 text-gray-500 hover:text-black transition-colors font-medium">
        <ArrowLeft size={18} />
        <span>Volver a la lista</span>
      </button>

      <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-black/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <span className="px-3 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                {raffle.status}
              </span>
              <span className="text-gray-400 text-xs font-medium">
                Creada el {format(new Date(raffle.created_at), "d MMM, yyyy", { locale: es })}
              </span>
            </div>
            <h2 className="text-4xl font-bold tracking-tighter text-black mb-4">{raffle.title}</h2>
            <p className="text-gray-500 max-w-2xl leading-relaxed">{raffle.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Costo</p>
                <p className="text-xl font-bold">${raffle.ticket_price} {raffle.currency}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Sorteo</p>
                <p className="text-xl font-bold">{format(new Date(raffle.draw_date), "d MMM", { locale: es })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Boletos</p>
                <p className="text-xl font-bold">{raffle.ticket_count}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Tipo</p>
                <p className="text-xl font-bold capitalize">{raffle.type}</p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-72 space-y-4">
            <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ventas</span>
                <span className="text-lg font-bold">{Math.round(((paidCount + reservedCount) / raffle.ticket_count) * 100)}%</span>
              </div>
              <div className="h-3 bg-white rounded-full overflow-hidden border border-gray-100">
                <div className="h-full bg-black" style={{ width: `${((paidCount + reservedCount) / raffle.ticket_count) * 100}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center">
                  <p className="text-lg font-bold">{paidCount}</p>
                  <p className="text-[8px] uppercase font-bold text-green-500">Pagado</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{reservedCount}</p>
                  <p className="text-[8px] uppercase font-bold text-orange-500">Apartado</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{availableCount}</p>
                  <p className="text-[8px] uppercase font-bold text-gray-400">Libre</p>
                </div>
              </div>
            </div>
            <button className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all">
              <Share2 size={18} />
              <span>Compartir Rifa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Grid Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-2xl font-bold tracking-tight">Mapa de Boletos</h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar número..." 
              value={searchTicket}
              onChange={(e) => setSearchTicket(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-2">
          {tickets.filter(t => t.number.includes(searchTicket)).map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => {
                setSelectedTicket(ticket);
                if (ticket.status === "available") setIsReserveModalOpen(true);
              }}
              className={cn(
                "aspect-square rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all border",
                ticket.status === "available" && "bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black",
                ticket.status === "reserved" && "bg-orange-50 text-orange-600 border-orange-100",
                ticket.status === "paid" && "bg-green-50 text-green-600 border-green-100"
              )}
            >
              <span>{ticket.number}</span>
              {ticket.status !== "available" && <div className="w-1 h-1 rounded-full bg-current mt-1" />}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Ticket Details / Participants List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-2xl font-bold tracking-tight">Participantes</h3>
          <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">Participante</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">Boleto</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">Estado</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.filter(t => t.status !== "available").map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-black">{ticket.participant_name}</p>
                      <p className="text-xs text-gray-400">{ticket.participant_whatsapp}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-bold">#{ticket.number}</span>
                      {ticket.opportunities && (
                        <p className="text-[10px] text-gray-400 mt-1">Ops: {ticket.opportunities}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        ticket.status === "paid" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                      )}>
                        {ticket.status === "paid" ? "Pagado" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {ticket.status === "reserved" && (
                          <button 
                            onClick={() => handleMarkPaid(ticket.id)}
                            className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                            title="Marcar como pagado"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <a 
                          href={ticket.participant_whatsapp ? buildWhatsAppUrl(ticket, raffle, user) : "#"}
                          target={ticket.participant_whatsapp ? "_blank" : undefined}
                          rel={ticket.participant_whatsapp ? "noopener noreferrer" : undefined}
                          className={cn(
                            "p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors",
                            !ticket.participant_whatsapp && "opacity-40 cursor-not-allowed"
                          )}
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </a>
                        <button 
                          onClick={() => downloadTicket(ticket)}
                          disabled={isDownloading}
                          className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
                          title="Descargar Ticket"
                        >
                          {isDownloading && ticketToDownload?.id === ticket.id ? (
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download size={16} />
                          )}
                        </button>
                        <button 
                          onClick={() => handleDeleteReservation(ticket.id)}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tickets.filter(t => t.status !== "available").length === 0 && (
              <div className="py-20 text-center">
                <p className="text-gray-400 text-sm">Aún no hay participantes registrados.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Ticket for Capture */}
      <div 
        className="fixed left-[-9999px] top-[-9999px] pointer-events-none opacity-0"
        aria-hidden="true"
      >
        {ticketToDownload && raffle && (
          <div ref={ticketRef}>
            <TicketCard 
              ticket={ticketToDownload} 
              raffle={raffle} 
              user={user}
            />
          </div>
        )}
      </div>

      {/* Reserve Modal */}
      {isReserveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-bold tracking-tight mb-2">Apartar Boleto #{selectedTicket?.number}</h3>
            <p className="text-gray-500 text-sm mb-8">Ingresa los datos del participante para reservar este número.</p>
            
            <form onSubmit={handleReserve} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Nombre Completo</label>
                <input 
                  required
                  type="text" 
                  value={reserveForm.name}
                  onChange={(e) => setReserveForm({...reserveForm, name: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">WhatsApp</label>
                <input 
                  required
                  type="tel" 
                  value={reserveForm.whatsapp}
                  onChange={(e) => setReserveForm({...reserveForm, whatsapp: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all"
                  placeholder="Ej. +52 1 234 567 890"
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsReserveModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
