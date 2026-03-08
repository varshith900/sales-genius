import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Bot, Loader2 } from "lucide-react";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  company: z.string().trim().min(1, "Company is required").max(100),
  email: z.string().trim().email("Invalid email").max(255).or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  industry: z.string().trim().max(100).optional(),
  budget: z.number().min(0).optional(),
  deal_size: z.number().min(0).optional(),
  deal_stage: z.string(),
  notes: z.string().trim().max(2000).optional(),
  products_interested: z.string().trim().max(500).optional(),
  last_interaction_date: z.string().optional(),
});

const dealStages = ["Lead", "Contacted", "Demo", "Negotiation", "Closed"];

const AddCustomer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    industry: "",
    budget: "",
    deal_size: "",
    deal_stage: "Lead",
    notes: "",
    products_interested: "",
    last_interaction_date: "",
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent, runAgent = false) => {
    e.preventDefault();
    if (!user) return;

    const parsed = customerSchema.safeParse({
      ...form,
      budget: form.budget ? Number(form.budget) : undefined,
      deal_size: form.deal_size ? Number(form.deal_size) : undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    const products = form.products_interested
      ? form.products_interested.split(",").map((p) => p.trim()).filter(Boolean)
      : null;

    const { data, error } = await supabase
      .from("customers")
      .insert({
        user_id: user.id,
        name: form.name.trim(),
        company: form.company.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        industry: form.industry.trim() || null,
        budget: form.budget ? Number(form.budget) : 0,
        deal_size: form.deal_size ? Number(form.deal_size) : 0,
        deal_stage: form.deal_stage,
        notes: form.notes.trim() || null,
        products_interested: products,
        last_interaction_date: form.last_interaction_date || null,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error("Failed to add customer: " + error.message);
      return;
    }

    toast.success(`${form.name} added successfully!`);
    if (runAgent && data) {
      navigate(`/customers/${data.id}?autoRun=true`);
    } else if (data) {
      navigate(`/customers/${data.id}`);
    }
  };

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/customers")}
          className="mb-4 text-muted-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>

        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Add Customer
        </h1>
        <p className="text-muted-foreground mb-6">
          Enter customer details to add them to your pipeline.
        </p>

        <form onSubmit={(e) => handleSubmit(e, false)}>
          <Card className="bg-card border-border p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  className="bg-secondary border-border"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  placeholder="e.g. TechVista Inc."
                  className="bg-secondary border-border"
                />
                {errors.company && (
                  <p className="text-xs text-destructive">{errors.company}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="e.g. sarah@techvista.com"
                  className="bg-secondary border-border"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="e.g. +1-555-0101"
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={form.industry}
                  onChange={(e) => update("industry", e.target.value)}
                  placeholder="e.g. Technology"
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal_stage">Deal Stage</Label>
                <Select
                  value={form.deal_stage}
                  onValueChange={(v) => update("deal_stage", v)}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dealStages.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal_size">Deal Size ($)</Label>
                <Input
                  id="deal_size"
                  type="number"
                  min="0"
                  value={form.deal_size}
                  onChange={(e) => update("deal_size", e.target.value)}
                  placeholder="e.g. 125000"
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.value)}
                  placeholder="e.g. 150000"
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_interaction_date">Last Contact Date</Label>
                <Input
                  id="last_interaction_date"
                  type="date"
                  value={form.last_interaction_date}
                  onChange={(e) =>
                    update("last_interaction_date", e.target.value)
                  }
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="products_interested">
                  Products Interested (comma-separated)
                </Label>
                <Input
                  id="products_interested"
                  value={form.products_interested}
                  onChange={(e) =>
                    update("products_interested", e.target.value)
                  }
                  placeholder="e.g. Enterprise Suite, Analytics Pro"
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Any relevant notes about this customer..."
                className="bg-secondary border-border min-h-[100px]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" variant="glow" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Save Customer
              </Button>
              <Button
                type="button"
                variant="agent"
                disabled={saving}
                onClick={(e) => handleSubmit(e, true)}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="mr-2 h-4 w-4" />
                )}
                Save & Run AI Agent
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </AppLayout>
  );
};

export default AddCustomer;
