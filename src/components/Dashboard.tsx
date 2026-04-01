import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from "lucide-react";
import { DashboardStats } from "@/src/types";
import { api } from "@/src/services/api";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/stats")
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-3xl border border-gray-100" />)}
        </div>
        <div className="h-96 bg-white rounded-3xl border border-gray-100" />
      </div>
    );
  }

  const pieData = [
    { name: "Pagado", value: stats.paid_tickets, color: "#000000" },
    { name: "Apartado", value: stats.reserved_tickets, color: "#9ca3af" },
    { name: "Disponible", value: stats.available_tickets, color: "#e5e7eb" },
  ];

  const cards = [
    { label: "Ingresos Totales", value: `$${(stats.total_revenue || 0).toLocaleString()}`, icon: DollarSign, trend: "+12%", color: "bg-black text-white" },
    { label: "Por Cobrar", value: `$${(stats.pending_revenue || 0).toLocaleString()}`, icon: Clock, trend: "-5%", color: "bg-white text-black border border-gray-100" },
    { label: "Boletos Vendidos", value: (stats.paid_tickets || 0) + (stats.reserved_tickets || 0), icon: Users, trend: "+8%", color: "bg-white text-black border border-gray-100" },
    { label: "Rifas Activas", value: stats.active_raffles || 0, icon: TrendingUp, trend: "0%", color: "bg-white text-black border border-gray-100" },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-black">Dashboard</h2>
        <p className="text-gray-500 mt-1">Bienvenido de nuevo. Aquí está el resumen de tu actividad.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className={cn("p-6 rounded-[2rem] shadow-sm", card.color)}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-xl bg-opacity-20 bg-gray-400">
                <card.icon size={20} />
              </div>
              <span className="text-xs font-bold flex items-center">
                {card.trend.startsWith('+') ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                {card.trend}
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-60 mb-1">{card.label}</p>
            <p className="text-3xl font-bold tracking-tighter">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold">Estado de Pagos</h3>
              <p className="text-sm text-gray-400">Distribución de boletos por estado</p>
            </div>
            <div className="flex space-x-4">
              {pieData.map(item => (
                <div key={item.name} className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium text-gray-500">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart / Secondary Info */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold mb-2 self-start">Ocupación</h3>
          <p className="text-sm text-gray-400 mb-8 self-start">Porcentaje de boletos apartados</p>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-4xl font-bold tracking-tighter">
              {stats.total_tickets > 0 ? Math.round(((stats.paid_tickets + stats.reserved_tickets) / stats.total_tickets) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-1">Vendido</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function for class names
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
