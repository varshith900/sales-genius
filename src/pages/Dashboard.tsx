import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
    { label: "Total Customers", value: stats.totalCustomers, icon: Users, color: "text-primary" },
    { label: "Active Opportunities", value: stats.activeOpportunities, icon: TrendingUp, color: "text-success" },
    { label: "Follow-ups Due", value: stats.followUpsDue, icon: Clock, color: "text-warning" },
    { label: "Closed Deals", value: stats.closedDeals, icon: BarChart3, color: "text-info" },
  ];

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's your sales overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label} className="bg-card border-border p-6 shadow-card hover:shadow-glow transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
              </div>
            </Card>
          ))}
        </div>

        <Button variant="glow" size="lg" onClick={() => navigate("/customers")}>
          View Customers
        </Button>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
