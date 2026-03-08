import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, Clock, BarChart3, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const AnimatedCounter = ({ value, duration = 1 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const stepTime = Math.max(Math.floor((duration * 1000) / end), 20);
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{count}</>;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeOpportunities: 0,
    followUpsDue: 0,
    closedDeals: 0,
  });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data: customers } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id);

      if (customers) {
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        setStats({
          totalCustomers: customers.length,
          activeOpportunities: customers.filter(c => !['Closed', 'Lead'].includes(c.deal_stage)).length,
          followUpsDue: customers.filter(c => c.last_interaction_date && new Date(c.last_interaction_date) < threeDaysAgo && c.deal_stage !== 'Closed').length,
          closedDeals: customers.filter(c => c.deal_stage === 'Closed').length,
        });
      }
    };
    fetchStats();
  }, [user]);

  const statCards = [
    { label: "Total Customers", value: stats.totalCustomers, icon: Users, gradient: "from-primary to-primary-glow" },
    { label: "Active Opportunities", value: stats.activeOpportunities, icon: TrendingUp, gradient: "from-success to-emerald-400" },
    { label: "Follow-ups Due", value: stats.followUpsDue, icon: Clock, gradient: "from-warning to-amber-400" },
    { label: "Closed Deals", value: stats.closedDeals, icon: BarChart3, gradient: "from-info to-cyan-400" },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary tracking-wide uppercase">Dashboard</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground">
            Welcome back
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Here's your sales performance overview.</p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            >
              <Card className="glass rounded-xl p-6 hover-lift cursor-pointer group relative overflow-hidden">
                {/* Subtle gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <p className="text-4xl font-display font-bold text-foreground">
                    <AnimatedCounter value={stat.value} />
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          className="flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Button variant="glow" size="lg" onClick={() => navigate("/customers")} className="group">
            View Customers
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate("/customers/new")} className="group">
            Add Customer
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
