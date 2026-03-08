import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, FileText, Mail, Package, Sparkles } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];

const actionIcons: Record<string, any> = {
  ai_full_run: Bot,
  ai_summary: FileText,
  ai_analysis: Sparkles,
  ai_nextAction: Bot,
  ai_email: Mail,
  ai_proposal: Package,
};

const actionColors: Record<string, string> = {
  ai_full_run: "bg-primary/20 text-primary",
  ai_summary: "bg-info/20 text-info",
  ai_analysis: "bg-warning/20 text-warning",
  ai_nextAction: "bg-success/20 text-success",
  ai_email: "bg-primary/20 text-primary",
  ai_proposal: "bg-info/20 text-info",
};

const ActivityPage = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setActivities(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-foreground">Activity Log</h1>
          <p className="text-muted-foreground mt-1">History of AI agent runs and generated content</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No activity yet. Run the AI Sales Agent on a customer to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = actionIcons[activity.action_type] || Bot;
              return (
                <Card key={activity.id} className="bg-card border-border p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${actionColors[activity.action_type] || "bg-secondary"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium truncate">{activity.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    {activity.action_type.replace("ai_", "").replace("_", " ")}
                  </Badge>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ActivityPage;
