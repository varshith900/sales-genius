import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, FileText, Mail, Package, Sparkles, Send, XCircle, Activity } from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];

const actionIcons: Record<string, any> = {
  ai_full_run: Bot,
  ai_summary: FileText,
  ai_analysis: Sparkles,
  ai_nextAction: Bot,
  ai_email: Mail,
  ai_proposal: Package,
  email_sent: Send,
  email_failed: XCircle,
};

const actionGradients: Record<string, string> = {
  ai_full_run: "from-primary to-primary-glow",
  ai_summary: "from-info to-cyan-400",
  ai_analysis: "from-warning to-amber-400",
  ai_nextAction: "from-success to-emerald-400",
  ai_email: "from-primary to-primary-glow",
  ai_proposal: "from-info to-cyan-400",
  email_sent: "from-success to-emerald-400",
  email_failed: "from-destructive to-red-400",
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

  // Skeleton
  const SkeletonActivity = () => (
    <div className="glass rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 shimmer rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="h-4 shimmer rounded w-3/4" />
        <div className="h-3 shimmer rounded w-1/3" />
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary tracking-wide uppercase">History</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground">Activity Log</h1>
          <p className="text-muted-foreground mt-2 text-lg">History of AI agent runs and generated content</p>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <SkeletonActivity key={i} />)}
          </div>
        ) : activities.length === 0 ? (
          <motion.div
            className="text-center py-16 text-muted-foreground"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Bot className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium">No activity yet</p>
            <p className="text-sm mt-1">Run the AI Sales Agent on a customer to get started.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, i) => {
              const Icon = actionIcons[activity.action_type] || Bot;
              const gradient = actionGradients[activity.action_type] || "from-muted to-muted";
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                >
                  <Card className="glass rounded-xl p-4 flex items-center gap-4 hover-lift group">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium truncate group-hover:text-primary transition-colors">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                      {activity.action_type.replace("ai_", "").replace("_", " ")}
                    </Badge>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ActivityPage;
