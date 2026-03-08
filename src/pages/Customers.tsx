import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Plus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

const stageColors: Record<string, string> = {
  Lead: "bg-muted text-muted-foreground",
  Contacted: "bg-info/20 text-info",
  Demo: "bg-primary/20 text-primary",
  Negotiation: "bg-warning/20 text-warning",
  Closed: "bg-success/20 text-success",
};

const Customers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setCustomers(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry?.toLowerCase().includes(search.toLowerCase()))
  );

  const seedData = async () => {
    if (!user) return;
    const mockCustomers = [
      { user_id: user.id, name: "Sarah Chen", company: "TechVista Inc.", email: "sarah@techvista.com", phone: "+1-555-0101", industry: "Technology", deal_size: 125000, budget: 150000, products_interested: ["Enterprise Suite", "Analytics Pro"], deal_stage: "Demo" as const, notes: "Very interested in analytics capabilities. Had great demo last week.", priority_score: 85, last_interaction_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { user_id: user.id, name: "Marcus Johnson", company: "GreenLeaf Solutions", email: "marcus@greenleaf.co", phone: "+1-555-0202", industry: "Sustainability", deal_size: 75000, budget: 80000, products_interested: ["Starter Plan", "API Access"], deal_stage: "Negotiation" as const, notes: "Budget approved. Discussing contract terms.", priority_score: 92, last_interaction_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { user_id: user.id, name: "Emily Rodriguez", company: "HealthFirst Medical", email: "emily@healthfirst.org", phone: "+1-555-0303", industry: "Healthcare", deal_size: 200000, budget: 250000, products_interested: ["Enterprise Suite", "HIPAA Module", "Support Premium"], deal_stage: "Contacted" as const, notes: "Initial call went well. Needs HIPAA compliance details.", priority_score: 78, last_interaction_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { user_id: user.id, name: "David Kim", company: "FinanceFlow", email: "david@financeflow.io", phone: "+1-555-0404", industry: "Finance", deal_size: 300000, budget: 350000, products_interested: ["Enterprise Suite", "Security Add-on", "Custom Integrations"], deal_stage: "Lead" as const, notes: "Referred by existing client. High potential.", priority_score: 70, last_interaction_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
      { user_id: user.id, name: "Lisa Thompson", company: "EduLearn Platform", email: "lisa@edulearn.com", phone: "+1-555-0505", industry: "Education", deal_size: 50000, budget: 60000, products_interested: ["Starter Plan"], deal_stage: "Closed" as const, notes: "Deal closed! Onboarding scheduled for next month.", priority_score: 95, last_interaction_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    ];
    const { error } = await supabase.from("customers").insert(mockCustomers);
    if (!error) {
      const { data } = await supabase.from("customers").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      setCustomers(data || []);
    }
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Customers</h1>
            <p className="text-muted-foreground mt-1">Manage your sales pipeline</p>
          </div>
          <div className="flex gap-2">
            <Button variant="glow" onClick={() => navigate("/customers/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
            {customers.length === 0 && !loading && (
              <Button variant="outline" onClick={seedData}>
                Load Demo Data
              </Button>
            )}
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary border-border max-w-md"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {customers.length === 0 ? "No customers yet. Load demo data to get started!" : "No matching customers found."}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Company</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Industry</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Deal Size</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Stage</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <td className="p-4">
                      <div className="font-medium text-foreground">{customer.name}</div>
                      <div className="text-sm text-muted-foreground md:hidden">{customer.company}</div>
                    </td>
                    <td className="p-4 text-foreground hidden md:table-cell">{customer.company}</td>
                    <td className="p-4 text-muted-foreground hidden lg:table-cell">{customer.industry || "—"}</td>
                    <td className="p-4 text-foreground hidden lg:table-cell">
                      {customer.deal_size ? `$${customer.deal_size.toLocaleString()}` : "—"}
                    </td>
                    <td className="p-4">
                      <Badge className={stageColors[customer.deal_stage] || ""}>{customer.deal_stage}</Badge>
                    </td>
                    <td className="p-4">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Customers;
