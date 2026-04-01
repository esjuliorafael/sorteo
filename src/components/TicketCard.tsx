import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Raffle, Ticket, User } from "../types";
import { cn } from "../lib/utils";

interface TicketCardProps {
  ticket: Ticket;
  raffle: Raffle;
  user?: User | null;
}

export default function TicketCard({ ticket, raffle, user }: TicketCardProps) {
  const isPaid = ticket.status === "paid";
  
  return (
    <div 
      id={`ticket-card-${ticket.id}`}
      className="w-[400px] bg-white p-8 rounded-[2rem] border border-gray-200 shadow-xl font-sans text-black overflow-hidden relative"
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      {/* Header */}
      <div className="relative z-10 flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">Sorteo</h1>
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Comprobante Digital</p>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
          isPaid ? "bg-green-50 text-green-600 border-green-100" : "bg-yellow-50 text-yellow-600 border-yellow-100"
        )}>
          {isPaid ? "PAGADO ✓" : "APARTADO"}
        </div>
      </div>

      {/* Raffle Info */}
      <div className="mb-8">
        <h2 className="text-xl font-bold tracking-tight mb-1">{raffle.title}</h2>
        <p className="text-xs text-gray-500 font-medium">
          Sorteo: {format(new Date(raffle.draw_date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* Ticket Number */}
      <div className="bg-gray-50 rounded-3xl p-6 mb-8 text-center border border-gray-100">
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Número de Boleto</p>
        <h3 className="text-6xl font-black tracking-tighter">#{ticket.number}</h3>
        {ticket.opportunities && (
          <p className="text-xs text-gray-500 font-bold mt-2">Ops: {ticket.opportunities}</p>
        )}
      </div>

      {/* Participant Info */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Participante</p>
          <p className="text-sm font-bold truncate">{ticket.participant_name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Costo</p>
          <p className="text-sm font-bold">${raffle.ticket_price} {raffle.currency}</p>
        </div>
      </div>

      {/* Bank Info (Optional) */}
      {user?.bank_name && !isPaid && (
        <div className="mb-8 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Datos para Pago</p>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-black">{user.bank_name}</p>
            <p className="text-[11px] font-mono font-bold text-black tracking-tighter">
              CLABE: {user.bank_clabe?.replace(/(.{4})/g, "$1 ").trim()}
            </p>
            <p className="text-[11px] font-medium text-gray-600">Titular: {user.bank_account_holder}</p>
            {user.bank_alias && <p className="text-[11px] font-medium text-gray-600">Alias: {user.bank_alias}</p>}
          </div>
        </div>
      )}

      {/* QR Code & Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-100">
        <div className="flex-1 pr-4">
          <p className="text-[10px] text-gray-400 font-medium leading-tight">
            Este ticket es tu comprobante oficial generado por la plataforma Sorteo.
          </p>
          <p className="text-[10px] font-bold mt-1">ID: {ticket.id}-{raffle.id}</p>
        </div>
        <div className="p-2 bg-white border border-gray-100 rounded-xl">
          <QRCodeSVG 
            value={`https://sorteo.app/verify/${ticket.id}`} 
            size={48} 
            level="L"
            includeMargin={false}
          />
        </div>
      </div>
    </div>
  );
}
