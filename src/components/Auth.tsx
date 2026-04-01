import React, { useState } from "react";
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Globe
} from "lucide-react";
import { api } from "@/src/services/api";
import { cn } from "@/src/lib/utils";

interface AuthProps {
  onAuthSuccess: (token: string, user: any) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const data = await api.post("/auth/login", { email: formData.email, password: formData.password });
        onAuthSuccess(data.token, data.user);
      } else {
        await api.post("/auth/register", formData);
        const data = await api.post("/auth/login", { email: formData.email, password: formData.password });
        onAuthSuccess(data.token, data.user);
      }
    } catch (err: any) {
      alert(err.message || "Error en la autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col lg:flex-row font-sans">
      {/* Left Side - Branding & Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-black text-white p-20 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10">
          <h1 className="text-6xl font-black tracking-tighter mb-4">KOUUN</h1>
          <p className="text-xl text-gray-400 max-w-md font-medium leading-relaxed">
            La plataforma definitiva para gestionar tus rifas digitales con profesionalismo y transparencia.
          </p>
        </div>

        <div className="relative z-10 space-y-10">
          <div className="flex items-start space-x-6">
            <div className="p-4 bg-white/10 rounded-3xl">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Seguridad Total</h3>
              <p className="text-gray-400 text-sm max-w-xs">Tus datos y los de tus participantes están protegidos con los más altos estándares.</p>
            </div>
          </div>
          <div className="flex items-start space-x-6">
            <div className="p-4 bg-white/10 rounded-3xl">
              <Zap size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Gestión Ágil</h3>
              <p className="text-gray-400 text-sm max-w-xs">Crea rifas en minutos y automatiza el seguimiento de pagos por WhatsApp.</p>
            </div>
          </div>
          <div className="flex items-start space-x-6">
            <div className="p-4 bg-white/10 rounded-3xl">
              <Globe size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Sin Instalaciones</h3>
              <p className="text-gray-400 text-sm max-w-xs">Tus participantes no necesitan descargar nada. Todo funciona desde el navegador.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-10 border-t border-white/10">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">© 2026 KOUUN SaaS B2B</p>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-20">
        <div className="w-full max-w-md space-y-10">
          <div className="lg:hidden text-center mb-10">
            <h1 className="text-4xl font-black tracking-tighter">KOUUN</h1>
          </div>

          <div className="text-center md:text-left">
            <h2 className="text-4xl font-bold tracking-tighter text-black mb-2">
              {isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta"}
            </h2>
            <p className="text-gray-500 font-medium">
              {isLogin ? "Ingresa tus credenciales para continuar." : "Comienza a profesionalizar tus sorteos hoy mismo."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-black/5 transition-all font-medium"
                    placeholder="Tu nombre"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-black/5 transition-all font-medium"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  required
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-black/5 transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-black text-white rounded-[2rem] font-bold text-lg flex items-center justify-center space-x-3 hover:bg-gray-800 transition-all shadow-2xl shadow-black/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? "Iniciar Sesión" : "Registrarme"}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="pt-6 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-gray-400 hover:text-black transition-colors flex items-center justify-center mx-auto space-x-2"
            >
              <span>{isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
