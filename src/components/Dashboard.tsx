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
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  AlertCircle,
  PlusCircle,
  CheckCircle2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { DashboardStats } from "@/src/types";
import { api } from "@/src/services/api";

interface SalesByRaffle {
  raffle_id: number;
  title: string;
  paid_count: number;
  reserved_count: number;
  ticket_price: number;
}

interface RevenueTimeline {
  date: string;
  revenue: number;
}

interface RecentActivity {
  type: 'reserved' | 'paid' | 'raffle_created';
  ticket_number?: string;
  participant_name?: string;
  raffle_title: string;
  timestamp: string;
}

interface UpcomingRaffle {
  id: number;
  title: string;
  draw_date: string;
  ticket_count: number;
  sold_count: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesByRaffle, setSalesByRaffle] = useState<SalesByRaffle[]>([]);
  const [revenueTimeline, setRevenueTimeline] = useState<RevenueTimeline[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingRaffles, setUpcomingRaffles] = useState<UpcomingRaffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, salesData, timelineData, activityData, upcomingData] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/dashboard/sales-by-raffle"),
          api.get("/dashboard/revenue-timeline"),
          api.get("/dashboard/recent-activity"),
          api.get("/dashboard/upcoming-raffles")
        ]);
        setStats(statsData);
        setSalesByRaffle(salesData);
        setRevenueTimeline(timelineData);
        setRecentActivity(activityData);
        setUpcomingRaffles(upcomingData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-3xl border border-gray-100" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-white rounded-3xl border border-gray-100" />
          <div className="h-96 bg-white rounded-3xl border border-gray-100" />
        </div>
        <div className="h-96 bg-white rounded-3xl border border-gray-100" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-white rounded-3xl border border-gray-100" />
          <div className="h-96 bg-white rounded-3xl border border-gray-100" />
        </div>
      </div>
    );
  }

  const pieData = [
    { name: "Pagado", value: stats.paid_tickets, color: "#000000" },
    { name: "Apartado", value: stats.reserved_tickets, color: "#9ca3af" },
    { name: "Disponible", value: stats.available_tickets, color: "#e5e7eb" },
  ];

  const showAlert = stats.pending_revenue > (stats.total_revenue * 0.3);

  const cards = [
    { label: "Ingresos Totales", value: `$${(stats.total_revenue || 0).toLocaleString()}`, icon: DollarSign, trend: "+12%", color: "bg-black text-white" },
    { 
      label: "Por Cobrar", 
      value: `$${(stats.pending_revenue || 0).toLocaleString()}`, 
      icon: Clock, 
      trend: "-5%", 
      color: "bg-white text-black border border-gray-100",
      alert: showAlert
    },
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
          <div key={i} className={cn("p-6 rounded-[2rem] shadow-sm relative overflow-hidden", card.color)}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-xl bg-opacity-20 bg-gray-400">
                <card.icon size={20} />
              </div>
              <div className="flex items-center space-x-2">
                {card.alert && (
                  <div className="flex items-center bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                    <AlertCircle size={10} className="mr-1" />
                    ALERTA
                  </div>
                )}
                <span className="text-xs font-bold flex items-center">
                  {card.trend.startsWith('+') ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                  {card.trend}
                </span>
              </div>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-60 mb-1">{card.label}</p>
            <p className="text-3xl font-bold tracking-tighter">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales by Raffle Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold">Ventas por Rifa</h3>
              <p className="text-sm text-gray-400">Rendimiento de tus rifas más recientes</p>
            </div>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-black" />
                <span className="text-xs font-medium text-gray-500">Pagado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-xs font-medium text-gray-500">Apartado</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByRaffle} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis dataKey="title" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="paid_count" stackId="a" fill="#000000" radius={[0, 0, 0, 0]} barSize={20} />
                <Bar dataKey="reserved_count" stackId="a" fill="#9ca3af" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupation Donut */}
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

      {/* Revenue Timeline */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="mb-8">
          <h3 className="text-lg font-bold">Ingresos últimos 30 días</h3>
          <p className="text-sm text-gray-400">Evolución de tus ganancias diarias</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTimeline}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(str) => format(new Date(str), 'dd MMM', { locale: es })}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(str) => format(new Date(str), 'PPPP', { locale: es })}
              />
              <Area type="monotone" dataKey="revenue" stroke="#000000" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid: Activity & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Actividad Reciente</h3>
          <div className="space-y-6">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 10).map((activity, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className={cn(
                    "p-2 rounded-xl",
                    activity.type === 'reserved' ? "bg-amber-100 text-amber-600" :
                    activity.type === 'paid' ? "bg-green-100 text-green-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {activity.type === 'reserved' ? <Clock size={16} /> :
                     activity.type === 'paid' ? <CheckCircle2 size={16} /> :
                     <PlusCircle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">
                      {activity.type === 'reserved' ? `Boleto #${activity.ticket_number} apartado por ${activity.participant_name}` :
                       activity.type === 'paid' ? `Boleto #${activity.ticket_number} pagado por ${activity.participant_name}` :
                       `Nueva rifa creada: ${activity.raffle_title}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {activity.raffle_title} • {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">No hay actividad reciente</p>
            )}
          </div>
        </div>

        {/* Upcoming Raffles */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Próximas Rifas</h3>
          <div className="space-y-4">
            {upcomingRaffles.length > 0 ? (
              upcomingRaffles.map((raffle) => {
                const progress = Math.round((raffle.sold_count / raffle.ticket_count) * 100);
                return (
                  <div key={raffle.id} className="p-4 rounded-2xl border border-gray-50 hover:border-gray-200 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-sm">{raffle.title}</h4>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Calendar size={12} className="mr-1" />
                          {format(new Date(raffle.draw_date), 'dd MMM, yyyy', { locale: es })}
                          <span className="mx-1">•</span>
                          {formatDistanceToNow(new Date(raffle.draw_date), { locale: es, addSuffix: false })} restantes
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-black">{progress}%</span>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Vendido</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-black rounded-full" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">No hay rifas próximas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
