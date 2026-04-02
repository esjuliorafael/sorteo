import React, { useState, useEffect } from "react";
import { api } from "@/src/services/api";
import { Raffle, Ticket, User } from "@/src/types";
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Search, 
  CheckCircle2, 
  Clock, 
  MessageCircle,
  ShieldCheck,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle, // BUG FIX 3
  Download // BUG FIX 4
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/src/lib/utils";

interface PublicRaffleProps {
  slug: string;
  shortId: string;
}

export default function PublicRaffle({ slug, shortId }: PublicRaffleProps) {
  const [data, setData] = useState<{ user: User; raffle: Raffle } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTicket, setSearchTicket] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reserveForm, setReserveForm] = useState({ name: "", whatsapp: "" });
  const [reservationSuccess, setReservationSuccess] = useState<Ticket | null>(null);
  const [reserving, setReserving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "pending" | "error" | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [showOxxoInstructions, setShowOxxoInstructions] = useState(false);

  useEffect(() => {
    let isMounted = true; // BUG FIX 1
    let pollingInterval: ReturnType<typeof setInterval> | null = null; // BUG FIX 1
    let pollingCount = 0;
    const MAX_POLLING_ATTEMPTS = 5;

    const init = async () => {
      const raffleData = await fetchRaffle();
      if (!isMounted) return; // BUG FIX 1
      
      // Check for payment status in URL
      const urlParams = new URLSearchParams(window.location.search);
      const paid = urlParams.get("paid");
      const ticketId = urlParams.get("ticket_id");
      const paymentId = urlParams.get("payment_id");
      const mpStatus = urlParams.get("status");
      const paymentType = urlParams.get("payment_type");

      if (paid && raffleData) {
        if (isMounted) setVerifyingPayment(true); // BUG FIX 1
        
        // Initial wait for 2 seconds to avoid anxiety
        await new Promise(r => setTimeout(r, 2000));
        if (!isMounted) return; // BUG FIX 1

        if (ticketId) {
          const ticket = raffleData.raffle.tickets?.find((t: any) => t.id === parseInt(ticketId));
          if (ticket) {
            if (isMounted) { // BUG FIX 1
              setReservationSuccess(ticket);
              setReserveForm({
                name: ticket.participant_name || "",
                whatsapp: ticket.participant_whatsapp || ""
              });
            }
          }
        }

        const verifyStatus = async () => {
          if (!isMounted) return true; // BUG FIX 1
          try {
            const statusData = await api.get(`/public/payment-status?payment_id=${paymentId || ""}&ticket_id=${ticketId || ""}`);
            
            if (statusData.status === 'approved') {
              if (isMounted) { // BUG FIX 1
                setPaymentStatus("success");
                setPaymentDetails({
                  ...statusData,
                  payment_type: statusData.payment_type ?? paymentType, // BUG FIX 2: statusData tiene prioridad
                  date: statusData.paid_at ? new Date(statusData.paid_at).getTime() : Date.now() // BUG FIX 2
                });
                setVerifyingPayment(false);
              }
              fetchRaffle(); // Refresh map
              return true;
            } else if (statusData.status === 'rejected') {
              if (isMounted) { // BUG FIX 1
                setPaymentStatus("error");
                setPaymentDetails({ mp_status: mpStatus });
                setVerifyingPayment(false);
              }
              fetchRaffle(); // Refresh map (ticket released)
              return true;
            } else if (statusData.status === 'pending_webhook') {
              // Keep polling
              return false;
            }
            return false;
          } catch (err) {
            console.error("Error verifying payment:", err);
            return false;
          }
        };

        if (paid === "true") {
          const confirmed = await verifyStatus();
          if (!confirmed && isMounted) { // BUG FIX 1
            pollingInterval = setInterval(async () => {
              pollingCount++;
              const done = await verifyStatus();
              if (done || pollingCount >= MAX_POLLING_ATTEMPTS) {
                if (pollingInterval) clearInterval(pollingInterval);
                if (!done && isMounted) { // BUG FIX 1
                  setPaymentStatus("pending");
                  setVerifyingPayment(false);
                }
              }
            }, 3000);
          }
        } else if (paid === "pending") {
          if (isMounted) { // BUG FIX 1
            setPaymentStatus("pending");
            setVerifyingPayment(false);
          }
        } else if (paid === "false") {
          if (isMounted) { // BUG FIX 1
            setPaymentStatus("error");
            setPaymentDetails({ mp_status: mpStatus });
            setVerifyingPayment(false);
          }
          fetchRaffle(); // Refresh map
        }

        if (isMounted) setIsReserveModalOpen(true); // BUG FIX 1
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    
    init();

    return () => {
      isMounted = false; // BUG FIX 1
      if (pollingInterval) clearInterval(pollingInterval); // BUG FIX 1
    };
  }, [slug, shortId]);

  const getPaymentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'credit_card': 'Tarjeta de Crédito',
      'debit_card': 'Tarjeta de Débito',
      'account_money': 'Dinero en cuenta Mercado Pago',
      'ticket': 'Efectivo (OXXO/7-Eleven)',
      'bank_transfer': 'Transferencia Bancaria',
      'atm': 'Cajero Automático',
      'prepaid_card': 'Tarjeta Prepago'
    };
    return types[type] || 'Otro método';
  };

  const fetchRaffle = async () => {
    try {
      const result = await api.get(`/public/${slug}/${shortId}`);
      setData(result);
      return result;
    } catch (err: any) {
      setError("Rifa no encontrada");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setReserving(true);
    try {
      const response = await api.post(`/public/${slug}/${shortId}/reserve`, {
        ticket_id: selectedTicket.id,
        participant_name: reserveForm.name,
        participant_whatsapp: reserveForm.whatsapp
      });
      setReservationSuccess(response.ticket);
      // Update local state
      if (data) {
        const updatedTickets = data.raffle.tickets?.map(t => 
          t.id === selectedTicket.id ? { ...t, status: 'reserved' as const } : t
        );
        setData({ ...data, raffle: { ...data.raffle, tickets: updatedTickets } });
      }
    } catch (err: any) {
      if (err.message === "already_taken") {
        alert("Este boleto ya fue apartado. Elige otro.");
        fetchRaffle(); // Refresh to show current status
      } else {
        alert("Error al apartar boleto");
      }
    } finally {
      setReserving(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setCheckoutLoading(true);
    try {
      const response = await api.post(`/public/${slug}/${shortId}/checkout`, {
        ticket_id: selectedTicket.id,
        participant_name: reserveForm.name,
        participant_whatsapp: reserveForm.whatsapp
      });
      // Redirect to Mercado Pago
      window.location.href = response.init_point;
    } catch (err: any) {
      if (err.message === "already_taken") {
        alert("Este boleto ya fue apartado o está en proceso de pago. Elige otro.");
        fetchRaffle();
      } else {
        alert("Error al iniciar el pago");
      }
      setCheckoutLoading(false);
    }
  };

  const buildWhatsAppUrl = () => {
    if (!data || !reservationSuccess) return "";
    const businessName = data.user.business_name || data.user.name;
    const phone = data.user.phone?.replace(/\D/g, "");
    if (!phone) return "";

    let message = "";
    if (paymentStatus === "success") {
      message = `¡Hola ${businessName}! Mi nombre es ${reserveForm.name}. Confirmo que mi pago por el boleto #${reservationSuccess.number} para la rifa '${data.raffle.title}' fue procesado con éxito por Mercado Pago.`;
    } else {
      message = `¡Hola ${businessName}! Mi nombre es ${reserveForm.name}. Aparté el boleto #${reservationSuccess.number} para la rifa '${data.raffle.title}'. Total: $${data.raffle.ticket_price} ${data.raffle.currency}. ¡Quedo pendiente de los datos de pago!`;
    }
    
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
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
        <a href={`/${slug}`} className="px-8 py-4 bg-black text-white rounded-2xl font-bold">Volver al perfil</a>
      </div>
    );
  }

  const tickets = data.raffle.tickets || [];
  const filteredTickets = tickets.filter(t => t.number.includes(searchTicket));

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans pb-20">
      {/* Header */}
      <div className="bg-black text-white pt-10 pb-32 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <a href={`/${slug}`} className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors font-bold text-xs uppercase tracking-widest">
            <ArrowLeft size={14} />
            <span>{data.user.business_name || data.user.name}</span>
          </a>
          
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter">{data.raffle.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-gray-400 font-medium">
              <div className="flex items-center space-x-2">
                <Calendar size={18} />
                <span>Sorteo: {format(new Date(data.raffle.draw_date), "d 'de' MMMM", { locale: es })}</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign size={18} />
                <span>Costo: ${data.raffle.ticket_price} {data.raffle.currency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 -mt-16 space-y-10">
        {/* Ticket Grid Section */}
        <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-sm space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold tracking-tight">Mapa de Boletos</h3>
              <p className="text-gray-400 text-sm font-medium">Selecciona un número disponible para apartar.</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar número..." 
                value={searchTicket}
                onChange={(e) => setSearchTicket(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => {
                  if (ticket.status === "available") {
                    setSelectedTicket(ticket);
                    setIsReserveModalOpen(true);
                  }
                }}
                className={cn(
                  "aspect-square rounded-2xl text-sm font-bold flex flex-col items-center justify-center transition-all border-2",
                  ticket.status === "available" && "bg-white text-gray-400 border-gray-50 hover:border-black hover:text-black hover:scale-105",
                  ticket.status === "reserved" && "bg-orange-50 text-orange-600 border-orange-100 cursor-not-allowed",
                  ticket.status === "paid" && "bg-green-50 text-green-600 border-green-100 cursor-not-allowed"
                )}
              >
                <span>{ticket.number}</span>
                {ticket.status !== "available" && <div className="w-1 h-1 rounded-full bg-current mt-1" />}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-gray-50">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-white border-2 border-gray-100" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Disponible</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Apartado</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pagado</span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-black/5 rounded-2xl">
              <ShieldCheck size={24} className="text-black" />
            </div>
            <h4 className="font-bold">Seguridad</h4>
            <p className="text-gray-400 text-sm leading-relaxed">Tus datos están protegidos y el sorteo es 100% transparente.</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-black/5 rounded-2xl">
              <Zap size={24} className="text-black" />
            </div>
            <h4 className="font-bold">Rapidez</h4>
            <p className="text-gray-400 text-sm leading-relaxed">Aparta tu número en segundos y confirma por WhatsApp.</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-black/5 rounded-2xl">
              <Globe size={24} className="text-black" />
            </div>
            <h4 className="font-bold">Sin Cuentas</h4>
            <p className="text-gray-400 text-sm leading-relaxed">No necesitas registrarte para participar en nuestras rifas.</p>
          </div>
        </div>
      </div>

      {/* Reserve Modal */}
      {isReserveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-300">
            {verifyingPayment ? (
              <div className="text-center space-y-8 py-10">
                <div className="w-20 h-20 bg-black/5 text-black rounded-full flex items-center justify-center mx-auto">
                  <Loader2 size={40} className="animate-spin" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter">Verificando Pago</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    Estamos confirmando tu transacción con Mercado Pago. Esto tomará solo unos segundos...
                  </p>
                </div>
              </div>
            ) : paymentStatus === "success" ? (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter">¡Boleto Pagado! 🎉</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    ¡Felicidades {reserveForm.name}! Tu boleto <span className="text-black font-bold">#{reservationSuccess?.number}</span> ha sido confirmado.
                  </p>
                </div>

                {paymentDetails && (
                  <div className="bg-gray-50 p-6 rounded-3xl text-left space-y-3 border border-gray-100">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Resumen del pago</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Boleto</p>
                        <p className="text-sm font-bold">#{paymentDetails.ticket_number}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Método</p>
                        <p className="text-sm font-bold">{getPaymentTypeLabel(paymentDetails.payment_type)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Fecha</p>
                        <p className="text-sm font-bold">{format(paymentDetails.date, "d 'de' MMMM, HH:mm 'hrs'", { locale: es })}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <button 
                    onClick={() => alert("Funcionalidad de descarga en desarrollo")}
                    className="w-full py-5 bg-black text-white rounded-3xl font-bold flex items-center justify-center space-x-3 hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
                  >
                    <Download size={20} /> {/* BUG FIX 4 */}
                    <span>Descargar Ticket Digital</span>
                  </button>
                  <a 
                    href={buildWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-5 bg-[#25D366] text-white rounded-3xl font-bold flex items-center justify-center space-x-3 hover:opacity-90 transition-all shadow-xl shadow-[#25D366]/20"
                  >
                    <MessageCircle size={20} />
                    <span>Compartir por WhatsApp</span>
                  </a>
                  <button 
                    onClick={() => {
                      setIsReserveModalOpen(false);
                      setPaymentStatus(null);
                      setReservationSuccess(null);
                      setPaymentDetails(null);
                    }}
                    className="w-full py-5 text-gray-400 font-bold hover:text-black transition-colors"
                  >
                    Cerrar ventana
                  </button>
                </div>
              </div>
            ) : paymentStatus === "pending" ? (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                  <Clock size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter">Pago en Proceso</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    {['ticket', 'atm', 'bank_transfer'].includes(paymentDetails?.payment_type ?? '') // BUG FIX 2
                      ? "Elegiste pagar en efectivo. Tu boleto permanece apartado por 72 horas. Realiza el pago antes de que expire."
                      : "Tu pago está siendo procesado por Mercado Pago. Recibirás una confirmación en cuanto se acredite."}
                  </p>
                </div>

                {['ticket', 'atm', 'bank_transfer'].includes(paymentDetails?.payment_type ?? '') && ( // BUG FIX 2
                  <div className="text-left border border-orange-100 rounded-3xl overflow-hidden">
                    <button 
                      onClick={() => setShowOxxoInstructions(!showOxxoInstructions)}
                      className="w-full p-6 bg-orange-50 flex items-center justify-between hover:bg-orange-100 transition-colors"
                    >
                      <span className="text-sm font-bold text-orange-800">¿Cómo pago en OXXO?</span>
                      {showOxxoInstructions ? <ChevronUp size={18} className="text-orange-800" /> : <ChevronDown size={18} className="text-orange-800" />}
                    </button>
                    {showOxxoInstructions && (
                      <div className="p-6 bg-white space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex space-x-3">
                          <div className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                          <p className="text-xs text-gray-600">Lleva tu comprobante (digital o impreso) a cualquier tienda OXXO.</p>
                        </div>
                        <div className="flex space-x-3">
                          <div className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                          <p className="text-xs text-gray-600">Indica al cajero que realizarás un pago de servicio de Mercado Pago.</p>
                        </div>
                        <div className="flex space-x-3">
                          <div className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                          <p className="text-xs text-gray-600">Escanea el código o dicta el número de referencia.</p>
                        </div>
                        <div className="flex space-x-3">
                          <div className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</div>
                          <p className="text-xs text-gray-600">¡Listo! Tu boleto se marcará como pagado automáticamente en unos minutos.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-orange-50 p-6 rounded-3xl text-left">
                  <p className="text-sm font-medium text-orange-800 leading-relaxed">
                    Tu boleto #{reservationSuccess?.number} permanecerá apartado hasta que se confirme el pago.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsReserveModalOpen(false);
                    setPaymentStatus(null);
                    setReservationSuccess(null);
                    setPaymentDetails(null);
                    setShowOxxoInstructions(false);
                  }}
                  className="w-full py-5 bg-black text-white rounded-3xl font-bold"
                >
                  Entendido
                </button>
              </div>
            ) : paymentStatus === "error" ? (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <XCircle size={40} /> {/* BUG FIX 3 */}
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter">
                    {paymentDetails?.mp_status === 'rejected' ? "Pago Rechazado" : "Pago No Procesado"}
                  </h3>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    {paymentDetails?.mp_status === 'rejected' 
                      ? "Tu pago fue rechazado por el banco. Intenta con otra tarjeta o usa una cuenta de Mercado Pago."
                      : "No se pudo completar el pago. Tu boleto fue liberado y está disponible nuevamente para otros participantes."}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsReserveModalOpen(false);
                    setPaymentStatus(null);
                    setReservationSuccess(null);
                    setPaymentDetails(null);
                    fetchRaffle(); // Refresh to show the released ticket
                  }}
                  className="w-full py-5 bg-black text-white rounded-3xl font-bold"
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : !reservationSuccess ? (
              <>
                <h3 className="text-3xl font-black tracking-tighter mb-2">Apartar Boleto #{selectedTicket?.number}</h3>
                <p className="text-gray-500 text-sm font-medium mb-8">Ingresa tus datos para reservar este número.</p>
                
                <form className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Nombre Completo</label>
                    <input 
                      required
                      type="text" 
                      value={reserveForm.name}
                      onChange={(e) => setReserveForm({...reserveForm, name: e.target.value})}
                      className="w-full px-6 py-5 bg-gray-50 border-none rounded-3xl focus:ring-4 focus:ring-black/5 transition-all font-medium"
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
                      className="w-full px-6 py-5 bg-gray-50 border-none rounded-3xl focus:ring-4 focus:ring-black/5 transition-all font-medium"
                      placeholder="Ej. 521234567890"
                    />
                  </div>
                  
                  <div className="space-y-3 pt-4">
                    {(data.user as any).mp_enabled ? (
                      <button 
                        type="button"
                        onClick={handleCheckout}
                        disabled={checkoutLoading || reserving || !reserveForm.name || !reserveForm.whatsapp}
                        className="w-full py-5 bg-[#009EE3] text-white rounded-3xl font-bold hover:opacity-90 transition-all shadow-xl shadow-[#009EE3]/20 flex items-center justify-center space-x-3 disabled:opacity-50"
                      >
                        {checkoutLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Zap size={20} />
                            <span>Pagar ahora — Mercado Pago</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={handleReserve}
                        disabled={reserving || checkoutLoading || !reserveForm.name || !reserveForm.whatsapp}
                        className="w-full py-5 bg-black text-white rounded-3xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                      >
                        {reserving ? "Apartando..." : "Apartar boleto"}
                      </button>
                    )}

                    <button 
                      type="button"
                      onClick={() => setIsReserveModalOpen(false)}
                      className="w-full py-4 rounded-3xl font-bold text-gray-400 hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter">¡Boleto Apartado!</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">
                    Has reservado el boleto <span className="text-black font-bold">#{reservationSuccess.number}</span> con éxito.
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl text-left space-y-4">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Siguiente paso</p>
                  <p className="text-sm font-medium text-gray-600 leading-relaxed">
                    Para confirmar tu participación, envía un mensaje al rifero por WhatsApp con tu comprobante de pago.
                  </p>
                </div>

                <div className="space-y-4">
                  {data.user.phone && (
                    <a 
                      href={buildWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-5 bg-[#25D366] text-white rounded-3xl font-bold flex items-center justify-center space-x-3 hover:opacity-90 transition-all shadow-xl shadow-[#25D366]/20"
                    >
                      <MessageCircle size={20} />
                      <span>Enviar WhatsApp al rifero</span>
                    </a>
                  )}
                  <button 
                    onClick={() => {
                      setIsReserveModalOpen(false);
                      setReservationSuccess(null);
                      setReserveForm({ name: "", whatsapp: "" });
                    }}
                    className="w-full py-5 text-gray-400 font-bold hover:text-black transition-colors"
                  >
                    Cerrar ventana
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
