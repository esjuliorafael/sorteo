import React, { useState, useEffect } from "react";
import { 
  User as UserIcon, 
  CreditCard, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  Mail,
  Building2,
  UserCheck,
  Hash,
  Tag,
  Globe,
  ArrowRight,
  Zap
} from "lucide-react";
import { User } from "@/src/types";
import { api } from "@/src/services/api";

interface SettingsProps {
  user: User | null;
  onUserUpdate: (user: User) => void;
}

const MEXICAN_BANKS = [
  "BBVA",
  "Banamex",
  "Banorte",
  "HSBC",
  "Santander",
  "Scotiabank",
  "Inbursa",
  "Banco del Bajío",
  "Afirme",
  "BanCoppel",
  "Banco Azteca",
  "Otro"
];

export default function Settings({ user, onUserUpdate }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "bank" | "payments">("profile");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [mpStatus, setMpStatus] = useState<{ connected: boolean; mp_user_id?: string } | null>(null);

  // Profile State
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    business_name: user?.business_name || "",
    business_slug: user?.business_slug || "",
    mp_checkout_enabled: user?.mp_checkout_enabled || false
  });

  // Bank State
  const [bankData, setBankData] = useState({
    bank_name: user?.bank_name || "",
    bank_clabe: user?.bank_clabe || "",
    bank_account_holder: user?.bank_account_holder || "",
    bank_alias: user?.bank_alias || ""
  });

  const [clabeError, setClabeError] = useState("");

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        phone: user.phone || "",
        business_name: user.business_name || "",
        business_slug: user.business_slug || "",
        mp_checkout_enabled: user.mp_checkout_enabled || false
      });
      setBankData({
        bank_name: user.bank_name || "",
        bank_clabe: user.bank_clabe || "",
        bank_account_holder: user.bank_account_holder || "",
        bank_alias: user.bank_alias || ""
      });
    }
  }, [user]);

  useEffect(() => {
    fetchMpStatus();
    
    // Check if returned from MP OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("mp") === "connected") {
      showToast("Mercado Pago conectado correctamente");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get("mp") === "error") {
      showToast("Error al conectar con Mercado Pago", "error");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchMpStatus = async () => {
    try {
      const status = await api.get("/mp/status");
      setMpStatus(status);
    } catch (e) {
      console.error("Error fetching MP status:", e);
    }
  };

  const handleMpConnect = async () => {
    setLoading(true);
    try {
      const { url } = await api.get("/mp/connect");
      window.location.href = url;
    } catch (e) {
      showToast("Error al iniciar conexión con Mercado Pago", "error");
      setLoading(false);
    }
  };

  const handleMpDisconnect = async () => {
    if (!confirm("¿Estás seguro de que deseas desconectar Mercado Pago?")) return;
    setLoading(true);
    try {
      await api.post("/mp/disconnect", {});
      setMpStatus({ connected: false });
      showToast("Mercado Pago desconectado");
    } catch (e) {
      showToast("Error al desconectar Mercado Pago", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/user/profile", profileData);
      if (user) {
        onUserUpdate({ ...user, ...profileData });
      }
      showToast("Perfil actualizado correctamente");
    } catch (error) {
      showToast("Error al actualizar el perfil", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (bankData.bank_clabe && !/^\d{18}$/.test(bankData.bank_clabe)) {
      setClabeError("La CLABE debe tener exactamente 18 dígitos numéricos");
      return;
    }
    setClabeError("");

    setLoading(true);
    try {
      await api.put("/user/bank-info", bankData);
      if (user) {
        onUserUpdate({ ...user, ...bankData });
      }
      showToast("Datos bancarios actualizados");
    } catch (error: any) {
      showToast(error.message || "Error al actualizar datos bancarios", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-black">Configuración</h2>
        <p className="text-gray-500 mt-1">Administra tu perfil y la información de pago para tus rifas.</p>
      </header>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "profile" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
          }`}
        >
          <UserIcon size={16} />
          <span>Mi Perfil</span>
        </button>
        <button
          onClick={() => setActiveTab("bank")}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "bank" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
          }`}
        >
          <CreditCard size={16} />
          <span>Datos Bancarios</span>
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "payments" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
          }`}
        >
          <Zap size={16} />
          <span>Pagos Directos</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "profile" ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                        placeholder="Tu nombre"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input
                        type="email"
                        value={user?.email || ""}
                        readOnly
                        className="w-full pl-12 pr-4 py-4 bg-gray-100 border-none rounded-2xl text-gray-400 cursor-not-allowed font-medium"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center bg-gray-200 text-gray-500 text-[10px] px-2 py-1 rounded-lg font-bold">
                        <AlertCircle size={10} className="mr-1" />
                        NO EDITABLE
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Teléfono / WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                        placeholder="Ej. 521234567890"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Nombre del Negocio
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={profileData.business_name}
                        onChange={(e) => setProfileData({ ...profileData, business_name: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                        placeholder="Ej. Rifas El Rayo"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Slug Público (sorteo.uno/tu-slug)
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={profileData.business_slug}
                        onChange={(e) => setProfileData({ ...profileData, business_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                        placeholder="ej-rifas-rayo"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 ml-1">Solo letras minúsculas, números y guiones.</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-900 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Guardar Perfil</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : activeTab === "bank" ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="mb-8">
                <p className="text-sm text-gray-500">
                  Estos datos aparecerán en tus tickets para que tus participantes sepan a dónde realizar el pago de sus boletos apartados.
                </p>
              </div>

              <form onSubmit={handleBankSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Banco
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <select
                        value={bankData.bank_name}
                        onChange={(e) => setBankData({ ...bankData, bank_name: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium appearance-none"
                        required
                      >
                        <option value="" disabled>Selecciona un banco</option>
                        {MEXICAN_BANKS.map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      CLABE Interbancaria (18 dígitos)
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        maxLength={18}
                        value={bankData.bank_clabe}
                        onChange={(e) => setBankData({ ...bankData, bank_clabe: e.target.value.replace(/\D/g, "") })}
                        className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 transition-all font-medium ${
                          clabeError ? "ring-2 ring-red-500" : "focus:ring-black"
                        }`}
                        placeholder="000000000000000000"
                        required
                      />
                    </div>
                    {clabeError && <p className="text-red-500 text-xs mt-2 ml-1 font-medium">{clabeError}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Titular de la Cuenta
                    </label>
                    <div className="relative">
                      <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={bankData.bank_account_holder}
                        onChange={(e) => setBankData({ ...bankData, bank_account_holder: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                        placeholder="Nombre completo del titular"
                        required
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Alias de Transferencia (Opcional)
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={bankData.bank_alias}
                        onChange={(e) => setBankData({ ...bankData, bank_alias: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                        placeholder="Ej. mi.rifa.sorteo"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-900 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Guardar Datos Bancarios</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : activeTab === "payments" ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">Mercado Pago</h3>
                <p className="text-sm text-gray-500">
                  Vincula tu cuenta de Mercado Pago para recibir pagos directos de tus participantes. El dinero cae directamente en tu cuenta (menos comisión del 3%).
                </p>
              </div>

              {mpStatus?.connected ? (
                <div className="space-y-6">
                  <div className="p-6 bg-green-50 border border-green-100 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-800">Mercado Pago conectado ✓</p>
                        <p className="text-xs text-green-600 font-medium">ID de cuenta: {mpStatus.mp_user_id}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleMpDisconnect}
                      disabled={loading}
                      className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 rounded-xl transition-all"
                    >
                      Desconectar
                    </button>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="space-y-1">
                        <p className="text-sm font-bold">Habilitar pago directo</p>
                        <p className="text-xs text-gray-500">Permite que los participantes paguen con tarjeta o transferencia desde tu escaparate.</p>
                      </div>
                      <button 
                        onClick={async () => {
                          const newValue = !profileData.mp_checkout_enabled;
                          setProfileData({ ...profileData, mp_checkout_enabled: newValue });
                          try {
                            await api.put("/user/profile", { ...profileData, mp_checkout_enabled: newValue });
                            if (user) onUserUpdate({ ...user, mp_checkout_enabled: newValue });
                            showToast("Preferencia actualizada");
                          } catch (e) {
                            showToast("Error al actualizar preferencia", "error");
                          }
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${profileData.mp_checkout_enabled ? "bg-black" : "bg-gray-200"}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${profileData.mp_checkout_enabled ? "left-7" : "left-1"}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <Zap size={32} className="text-gray-300" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold">Aún no has conectado Mercado Pago</p>
                    <p className="text-sm text-gray-400">Conecta tu cuenta para automatizar tus cobros.</p>
                  </div>
                  <button 
                    onClick={handleMpConnect}
                    disabled={loading}
                    className="inline-flex items-center space-x-3 px-8 py-4 bg-[#009EE3] text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[#009EE3]/20"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
                      <path d="M11 7H13V13H11V7ZM11 15H13V17H11V15Z" fill="currentColor"/>
                    </svg>
                    <span>Conectar con Mercado Pago</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          {user?.business_slug && (
            <div className="bg-black text-white p-6 rounded-[2rem] shadow-xl space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Globe size={18} />
                </div>
                <h4 className="font-bold text-sm">Escaparate Público</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Tu escaparate está activo. Comparte este enlace con tus participantes para que puedan ver tus rifas y apartar boletos.
              </p>
              <a 
                href={`/${user.business_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-white text-black rounded-xl font-bold text-xs flex items-center justify-center space-x-2 hover:bg-gray-100 transition-all"
              >
                <span>Ver mi escaparate</span>
                <ArrowRight size={14} />
              </a>
            </div>
          )}

          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Vista Previa en Ticket</h3>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Información de Pago</p>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Banco</p>
                  <p className="text-sm font-bold text-black">{bankData.bank_name || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">CLABE</p>
                  <p className="text-sm font-mono font-bold text-black tracking-tighter">
                    {bankData.bank_clabe ? bankData.bank_clabe.replace(/(.{4})/g, "$1 ").trim() : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Titular</p>
                  <p className="text-sm font-bold text-black">{bankData.bank_account_holder || "—"}</p>
                </div>
                {bankData.bank_alias && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Alias</p>
                    <p className="text-sm font-bold text-black">{bankData.bank_alias}</p>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-400 text-center italic">
              * Esta información se incluirá automáticamente en todos tus tickets generados.
            </p>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom-4 duration-300 z-50 ${
          toast.type === "success" ? "bg-black text-white" : "bg-red-500 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
