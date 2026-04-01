import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Ticket, 
  PlusCircle, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  CreditCard
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { User } from "@/src/types";

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, user, onLogout, activeTab, setActiveTab }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "raffles", label: "Mis Rifas", icon: Ticket },
    { id: "create", label: "Crear Rifa", icon: PlusCircle },
    { id: "subscription", label: "Suscripción", icon: CreditCard },
    { id: "settings", label: "Configuración", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col md:flex-row font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold tracking-tighter text-black">Sorteo</h1> {/* renamed: KOUUN → Sorteo */}
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mt-1">Rifas Digitales</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
                activeTab === item.id 
                  ? "bg-black text-white shadow-lg shadow-black/10" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-black"
              )}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate capitalize">{user?.plan} Plan</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-50 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tighter text-black">Sorteo</h1> {/* renamed: KOUUN → Sorteo */}
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 pt-20 p-6 md:hidden">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl text-lg font-medium",
                  activeTab === item.id ? "bg-black text-white" : "text-gray-600"
                )}
              >
                <item.icon size={24} />
                <span>{item.label}</span>
              </button>
            ))}
            <button 
              onClick={onLogout}
              className="w-full flex items-center space-x-4 px-6 py-4 rounded-2xl text-lg font-medium text-red-500"
            >
              <LogOut size={24} />
              <span>Cerrar Sesión</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
