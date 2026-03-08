import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
  const [autoSendEmail, setAutoSendEmail] = useState(false);
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

  // Auto-run agent if redirected from Add Customer with ?autoRun=true
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

    // Extract subject line from email content (first line after "Subject:")
    let subject = `Follow-up from SalesAgent AI`;
    const subjectMatch = emailContent.match(/Subject:\s*(.+)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
    }

    // Remove the subject line from body
    const body = emailContent.replace(/Subject:\s*.+\n?/i, "").trim();

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
        user_id: user.id,
        customer_id: cust.id,
        action_type: "email_sent",
        description: `Email sent to ${cust.name} at ${cust.email}`,
      });
    } catch (error: any) {
      setEmailStatus("failed");
      toast.error(`Email failed: ${error.message}`);

      await supabase.from("activity_log").insert({
        user_id: user.id,
        customer_id: cust.id,
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

        // Auto-send email after generation if toggle is on
        if (steps[i] === "email" && autoSendEmail && customer.email) {
          await sendEmail(result, customer);
        }
      }

      await supabase.from("activity_log").insert({
        user_id: user.id,
        customer_id: customer.id,
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
        user_id: user.id,
        customer_id: customer.id,
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
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">Customer not found.</div>
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
    { key: "summary", title: "Account Summary", icon: FileText },
    { key: "analysis", title: "Opportunity Analysis", icon: Sparkles },
    { key: "nextAction", title: "Next Best Action", icon: Bot },
    { key: "email", title: "Follow-up Email", icon: Mail },
    { key: "proposal", title: "Sales Proposal", icon: Package },
  ];

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-5xl">
        <Button variant="ghost" onClick={() => navigate("/customers")} className="mb-4 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>

        {/* Customer Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{customer.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{customer.company}</span>
              <Badge className={stageColors[customer.deal_stage]}>{customer.deal_stage}</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-end">
            <Button variant="agent" size="lg" onClick={runFullAgent} disabled={agentRunning}>
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
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-send"
                  checked={autoSendEmail}
                  onCheckedChange={setAutoSendEmail}
                />
                <Label htmlFor="auto-send" className="text-sm text-muted-foreground cursor-pointer">
                  Auto-send email
                </Label>
                {emailStatus === "sent" && (
                  <Badge className="bg-success/20 text-success gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Sent {emailSentAt}
                  </Badge>
                )}
                {emailStatus === "failed" && (
                  <Badge className="bg-destructive/20 text-destructive gap-1">
                    <XCircle className="h-3 w-3" /> Failed
                  </Badge>
                )}
                {emailStatus === "sending" && (
                  <Badge className="bg-info/20 text-info gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Sending...
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Customer Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Mail, label: "Email", value: customer.email },
            { icon: Phone, label: "Phone", value: customer.phone },
            { icon: Building, label: "Industry", value: customer.industry },
            { icon: DollarSign, label: "Deal Size", value: customer.deal_size ? `$${customer.deal_size.toLocaleString()}` : null },
            { icon: DollarSign, label: "Budget", value: customer.budget ? `$${customer.budget.toLocaleString()}` : null },
            { icon: Calendar, label: "Last Contact", value: customer.last_interaction_date ? new Date(customer.last_interaction_date).toLocaleDateString() : null },
          ].map((info) => (
            <Card key={info.label} className="bg-card border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <info.icon className="h-3.5 w-3.5" />
                {info.label}
              </div>
              <div className="text-foreground font-medium">{info.value || "—"}</div>
            </Card>
          ))}
        </div>

        {customer.products_interested && customer.products_interested.length > 0 && (
          <Card className="bg-card border-border p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-2">Products Interested</p>
            <div className="flex flex-wrap gap-2">
              {customer.products_interested.map((p) => (
                <Badge key={p} variant="secondary">{p}</Badge>
              ))}
            </div>
          </Card>
        )}

        {customer.notes && (
          <Card className="bg-card border-border p-4 mb-8">
            <p className="text-sm text-muted-foreground mb-2">Notes</p>
            <p className="text-foreground">{customer.notes}</p>
          </Card>
        )}

        {/* Manual AI Tools */}
        <div className="flex flex-wrap gap-2 mb-8">
          {resultSections.map((section) => (
            <Button
              key={section.key}
              variant="outline"
              size="sm"
              onClick={() => runSingle(section.key)}
              disabled={singleLoading === section.key || agentRunning}
            >
              {singleLoading === section.key ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <section.icon className="mr-2 h-4 w-4" />
              )}
              {section.title}
            </Button>
          ))}
        </div>

        {/* AI Results */}
        <div className="space-y-4">
          {resultSections.map((section) => {
            const content = results[section.key as keyof AgentResults];
            if (!content) return null;
            return (
              <Card key={section.key} className="bg-card border-border p-6 animate-fade-in shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <section.icon className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-semibold text-foreground">{section.title}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(content, section.title)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadText(content, `${customer.name}-${section.key}.txt`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {section.key === "email" && customer.email && emailStatus !== "sent" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => sendEmail(content, customer)}
                        disabled={emailStatus === "sending"}
                        title={`Send to ${customer.email}`}
                      >
                        {emailStatus === "sending" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default CustomerDetail;
