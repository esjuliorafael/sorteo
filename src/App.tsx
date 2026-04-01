import React, { useState, useEffect } from "react";
import Auth from "./components/Auth";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import RaffleList from "./components/RaffleList";
import RaffleDetail from "./components/RaffleDetail";
import CreateRaffle from "./components/CreateRaffle";
import Onboarding from "./components/Onboarding";
import Subscription from "./components/Subscription";
import { User } from "./types";
import { api } from "./services/api";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedRaffleId, setSelectedRaffleId] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const userData = await api.get("/user/profile");
      setUser(userData);
      
      // Check if onboarding was shown
      const onboardingShown = localStorage.getItem(`onboarding_${userData.id}`);
      if (!onboardingShown) {
        setShowOnboarding(true);
      }
    } catch (err) {
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (newToken: string, userData: User) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
    
    const onboardingShown = localStorage.getItem(`onboarding_${userData.id}`);
    if (!onboardingShown) {
      setShowOnboarding(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setActiveTab("dashboard");
    setSelectedRaffleId(null);
  };

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_${user.id}`, "true");
    }
    setShowOnboarding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-4xl font-black tracking-tighter text-white animate-pulse">Sorteo</h1>{/* renamed: KOUUN → Sorteo */}
          <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white animate-[loading_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={(tab) => {
        setActiveTab(tab);
        setSelectedRaffleId(null);
      }}
    >
      {activeTab === "dashboard" && <Dashboard />}
      {activeTab === "raffles" && (
        selectedRaffleId ? (
          <RaffleDetail 
            raffleId={selectedRaffleId} 
            onBack={() => setSelectedRaffleId(null)} 
          />
        ) : (
          <RaffleList 
            onSelectRaffle={setSelectedRaffleId} 
            onCreateRaffle={() => setActiveTab("create")} 
          />
        )
      )}
      {activeTab === "create" && (
        <CreateRaffle 
          onSuccess={() => setActiveTab("raffles")} 
          onCancel={() => setActiveTab("raffles")} 
        />
      )}
      {activeTab === "subscription" && <Subscription user={user} />}
      {activeTab === "settings" && (
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">Configuración</h2>
          <p className="text-gray-500">Próximamente: Ajustes de perfil, notificaciones y datos bancarios.</p>
        </div>
      )}
    </Layout>
  );
}
