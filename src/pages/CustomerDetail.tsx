import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { MarkdownRenderer, stripMarkdown } from "@/components/MarkdownRenderer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  ArrowLeft,
  Building,
  Mail,
  Phone,
  DollarSign,
  Package,
  Calendar,
  FileText,
  Sparkles,
  Copy,
  Download,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface AgentResults {
  summary?: string;
  analysis?: string;
  nextAction?: string;
  email?: string;
  proposal?: string;
}

const stageColors: Record<string, string> = {
  Lead: "bg-muted text-muted-foreground",
  Contacted: "bg-info/20 text-info",
  Demo: "bg-primary/20 text-primary",
  Negotiation: "bg-warning/20 text-warning",
  Closed: "bg-success/20 text-success",
};

const stageGradients: Record<string, string> = {
  Lead: "from-muted-foreground/20 to-muted-foreground/5",
  Contacted: "from-info/20 to-info/5",
  Demo: "from-primary/20 to-primary/5",
  Negotiation: "from-warning/20 to-warning/5",
  Closed: "from-success/20 to-success/5",
};

// Skeleton loader component
const SkeletonCard = () => (
  <div className="glass rounded-xl p-6 space-y-3">
    <div className="h-4 shimmer rounded w-1/3" />
    <div className="h-3 shimmer rounded w-2/3" />
    <div className="h-3 shimmer rounded w-1/2" />
  </div>
);

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentStep, setAgentStep] = useState(0);
  const [results, setResults] = useState<AgentResults>({});
  const [singleLoading, setSingleLoading] = useState<string | null>(null);
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [emailSentAt, setEmailSentAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    const fetchCustomer = async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      setCustomer(data);
      setLoading(false);
    };
    fetchCustomer();
  }, [user, id]);

  useEffect(() => {
    if (customer && searchParams.get("autoRun") === "true" && !agentRunning) {
      runFullAgent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const callAI = async (type: string, customerData: Customer) => {
    const response = await supabase.functions.invoke("sales-agent", {
      body: { type, customer: customerData },
    });
    if (response.error) throw new Error(response.error.message);
    return response.data?.result || "";
  };

  const sendEmail = async (emailContent: string, cust: Customer) => {
    if (!cust.email || !user) return;
    setEmailStatus("sending");
    let subject = `Follow-up from SalesAgent AI`;
    const subjectMatch = emailContent.match(/Subject:\s*(.+)/i);
    if (subjectMatch) subject = stripMarkdown(subjectMatch[1].trim());
    const body = stripMarkdown(emailContent.replace(/Subject:\s*.+\n?/i, "").trim());

    try {
      const response = await supabase.functions.invoke("send-email", {
        body: { to: cust.email, subject, body, customerName: cust.name },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      setEmailStatus("sent");
      setEmailSentAt(new Date().toLocaleString());
      toast.success(`Email sent to ${cust.email}!`);
      await supabase.from("activity_log").insert({
        user_id: user.id, customer_id: cust.id,
        action_type: "email_sent",
        description: `Email sent to ${cust.name} at ${cust.email}`,
      });
    } catch (error: any) {
      setEmailStatus("failed");
      toast.error(`Email failed: ${error.message}`);
      await supabase.from("activity_log").insert({
        user_id: user.id, customer_id: cust.id,
        action_type: "email_failed",
        description: `Email to ${cust.name} failed: ${error.message}`,
      });
    }
  };

  const runFullAgent = async () => {
    if (!customer || !user) return;
    setAgentRunning(true);
    setResults({});
    setEmailStatus("idle");
    const steps = ["summary", "analysis", "nextAction", "email", "proposal"];
    try {
      for (let i = 0; i < steps.length; i++) {
        setAgentStep(i + 1);
        const result = await callAI(steps[i], customer);
        setResults((prev) => ({ ...prev, [steps[i]]: result }));
        if (steps[i] === "email" && autoSendEmail && customer.email) {
          await sendEmail(result, customer);
        }
      }
      await supabase.from("activity_log").insert({
        user_id: user.id, customer_id: customer.id,
        action_type: "ai_full_run",
        description: `Full AI agent run for ${customer.name}`,
      });
      toast.success("AI Sales Agent completed all steps!");
    } catch (error: any) {
      toast.error(`Agent error: ${error.message}`);
    } finally {
      setAgentRunning(false);
      setAgentStep(0);
    }
  };

  const runSingle = async (type: string) => {
    if (!customer || !user) return;
    setSingleLoading(type);
    try {
      const result = await callAI(type, customer);
      setResults((prev) => ({ ...prev, [type]: result }));
      await supabase.from("activity_log").insert({
        user_id: user.id, customer_id: customer.id,
        action_type: `ai_${type}`,
        description: `AI ${type} for ${customer.name}`,
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSingleLoading(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-5xl space-y-6">
          <div className="h-8 shimmer rounded w-48" />
          <div className="h-12 shimmer rounded w-72" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Building className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium">Customer not found</p>
        </div>
      </AppLayout>
    );
  }

  const stepLabels = [
    "Retrieving data...",
    "Generating summary...",
    "Analyzing opportunity...",
    "Determining next action...",
    "Drafting email...",
    "Creating proposal...",
  ];

  const resultSections = [
    { key: "summary", title: "Account Summary", icon: FileText, gradient: "from-info/10 to-transparent" },
    { key: "analysis", title: "Opportunity Analysis", icon: Sparkles, gradient: "from-warning/10 to-transparent" },
    { key: "nextAction", title: "Next Best Action", icon: Bot, gradient: "from-success/10 to-transparent" },
    { key: "email", title: "Follow-up Email", icon: Mail, gradient: "from-primary/10 to-transparent" },
    { key: "proposal", title: "Sales Proposal", icon: Package, gradient: "from-accent/10 to-transparent" },
  ];

  const infoCards = [
    { icon: Mail, label: "Email", value: customer.email },
    { icon: Phone, label: "Phone", value: customer.phone },
    { icon: Building, label: "Industry", value: customer.industry },
    { icon: DollarSign, label: "Deal Size", value: customer.deal_size ? `$${customer.deal_size.toLocaleString()}` : null },
    { icon: DollarSign, label: "Budget", value: customer.budget ? `$${customer.budget.toLocaleString()}` : null },
    { icon: Calendar, label: "Last Contact", value: customer.last_interaction_date ? new Date(customer.last_interaction_date).toLocaleDateString() : null },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Button variant="ghost" onClick={() => navigate("/customers")} className="mb-4 text-muted-foreground group">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Customers
          </Button>
        </motion.div>

        {/* Customer Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">{customer.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span className="text-lg">{customer.company}</span>
              <Badge className={`${stageColors[customer.deal_stage]} text-xs font-semibold`}>{customer.deal_stage}</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-end">
            <Button variant="agent" size="lg" onClick={runFullAgent} disabled={agentRunning} className="min-w-[220px]">
              {agentRunning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {stepLabels[agentStep] || "Processing..."}
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-5 w-5" />
                  Run AI Sales Agent
                </>
              )}
            </Button>
            {customer.email && (
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Switch id="auto-send" checked={autoSendEmail} onCheckedChange={setAutoSendEmail} />
                <Label htmlFor="auto-send" className="text-sm text-muted-foreground cursor-pointer">
                  Auto-send email
                </Label>
                <AnimatePresence>
                  {emailStatus === "sent" && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      <Badge className="bg-success/20 text-success gap-1"><CheckCircle2 className="h-3 w-3" /> Sent {emailSentAt}</Badge>
                    </motion.div>
                  )}
                  {emailStatus === "failed" && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      <Badge className="bg-destructive/20 text-destructive gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>
                    </motion.div>
                  )}
                  {emailStatus === "sending" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Badge className="bg-info/20 text-info gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Sending...</Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Progress bar during agent run */}
        <AnimatePresence>
          {agentRunning && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-foreground">{stepLabels[agentStep]}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full gradient-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(agentStep / 5) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Customer Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {infoCards.map((info, i) => (
            <motion.div
              key={info.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
            >
              <Card className="glass rounded-xl p-4 hover-lift group">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1.5">
                  <info.icon className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
                  {info.label}
                </div>
                <div className="text-foreground font-medium text-lg">{info.value || "—"}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {customer.products_interested && customer.products_interested.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card className="glass rounded-xl p-5 mb-4">
              <p className="text-sm text-muted-foreground mb-3 font-medium">Products Interested</p>
              <div className="flex flex-wrap gap-2">
                {customer.products_interested.map((p) => (
                  <Badge key={p} variant="secondary" className="hover:bg-primary/10 hover:text-primary transition-colors">{p}</Badge>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {customer.notes && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
            <Card className="glass rounded-xl p-5 mb-8">
              <p className="text-sm text-muted-foreground mb-2 font-medium">Notes</p>
              <p className="text-foreground leading-relaxed">{customer.notes}</p>
            </Card>
          </motion.div>
        )}

        {/* Manual AI Tools */}
        <motion.div
          className="flex flex-wrap gap-2 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {resultSections.map((section) => (
            <Button
              key={section.key}
              variant="outline"
              size="sm"
              onClick={() => runSingle(section.key)}
              disabled={singleLoading === section.key || agentRunning}
              className="group"
            >
              {singleLoading === section.key ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <section.icon className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" />
              )}
              {section.title}
            </Button>
          ))}
        </motion.div>

        {/* AI Results */}
        <div className="space-y-5">
          <AnimatePresence>
            {resultSections.map((section) => {
              const content = results[section.key as keyof AgentResults];
              if (!content) return null;
              return (
                <motion.div
                  key={section.key}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <Card className={`glass rounded-xl p-6 shadow-card relative overflow-hidden`}>
                    {/* Gradient accent strip */}
                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${section.gradient}`} />
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <section.icon className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <h3 className="font-display font-semibold text-foreground text-lg">{section.title}</h3>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(content, section.title)} className="hover:text-primary">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => downloadText(content, `${customer.name}-${section.key}.txt`)} className="hover:text-primary">
                          <Download className="h-4 w-4" />
                        </Button>
                        {section.key === "email" && customer.email && emailStatus !== "sent" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => sendEmail(content, customer)}
                            disabled={emailStatus === "sending"}
                            title={`Send to ${customer.email}`}
                            className="hover:text-primary"
                          >
                            {emailStatus === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                    <MarkdownRenderer content={content} className="text-sm" />
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

export default CustomerDetail;
