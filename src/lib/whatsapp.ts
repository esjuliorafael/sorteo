import { Ticket, Raffle, User } from "../types";

/**
 * Builds a WhatsApp wa.me URL with a pre-formatted message based on ticket status.
 */
export function buildWhatsAppUrl(ticket: Ticket, raffle: Raffle, user?: User | null) {
  if (!ticket.participant_whatsapp) return "";

  // Clean phone number: remove +, spaces, dashes, etc.
  const phoneNumber = ticket.participant_whatsapp.replace(/\D/g, "");
  
  let message = `¡Hola ${ticket.participant_name}! 👋\n\n`;
  
  if (ticket.status === "reserved") {
    message += `Te escribo de *Sorteo* para informarte que tu boleto *#${ticket.number}* para la rifa *"${raffle.title}"* ha sido apartado exitosamente. 🎟️\n\n`;
    message += `💰 *Total a pagar:* $${raffle.ticket_price} ${raffle.currency}\n\n`;
    
    // Check for bank details in user profile (rifero)
    // Using optional property access in case it's added later
    const bankDetails = (user as any)?.bank_details;
    if (bankDetails) {
      message += `🏦 *Datos bancarios para el pago:*\n${bankDetails}\n\n`;
    }
    
    message += `Por favor, envía tu comprobante de pago por este medio para confirmar tu participación. ¡Muchas gracias! 🙏`;
  } else if (ticket.status === "paid") {
    message += `¡Excelentes noticias! 🌟\n\nTu pago por el boleto *#${ticket.number}* para la rifa *"${raffle.title}"* ha sido confirmado. ✅\n\n`;
    
    if (ticket.opportunities) {
      message += `Tus números de oportunidad son: *${ticket.opportunities}*\n\n`;
    }
    
    message += `¡Mucha suerte en el sorteo! 🍀`;
  }

  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}
