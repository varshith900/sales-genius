import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const prompts: Record<string, (c: any) => string> = {
  summary: (c) => `You are a sales analyst. Provide a concise account summary for this customer:\n\nName: ${c.name}\nCompany: ${c.company}\nIndustry: ${c.industry || "Unknown"}\nDeal Size: $${c.deal_size || 0}\nBudget: $${c.budget || 0}\nDeal Stage: ${c.deal_stage}\nProducts Interested: ${(c.products_interested || []).join(", ")}\nLast Interaction: ${c.last_interaction_date || "Unknown"}\nNotes: ${c.notes || "None"}\n\nProvide a 3-4 sentence professional summary of this account.`,

  analysis: (c) => `You are a sales strategist. Analyze this opportunity:\n\nCustomer: ${c.name} at ${c.company}\nIndustry: ${c.industry || "Unknown"}\nDeal Size: $${c.deal_size || 0}\nBudget: $${c.budget || 0}\nDeal Stage: ${c.deal_stage}\nProducts: ${(c.products_interested || []).join(", ")}\nLast Contact: ${c.last_interaction_date || "Unknown"}\nNotes: ${c.notes || "None"}\n\nProvide:\n1. Deal Health (Strong/Moderate/At Risk)\n2. Urgency Level (High/Medium/Low)\n3. Key factors affecting the deal\n4. Win probability estimate`,

  nextAction: (c) => `You are a sales coach. Based on this customer data, recommend the single best next action:\n\nCustomer: ${c.name} at ${c.company}\nDeal Stage: ${c.deal_stage}\nDeal Size: $${c.deal_size || 0}\nBudget: $${c.budget || 0}\nProducts: ${(c.products_interested || []).join(", ")}\nLast Contact: ${c.last_interaction_date || "Unknown"}\nNotes: ${c.notes || "None"}\n\nProvide a specific, actionable next step with reasoning. Be concise.`,

  email: (c) => `You are a professional sales representative. Write a follow-up email for this customer:\n\nCustomer: ${c.name}\nCompany: ${c.company}\nDeal Stage: ${c.deal_stage}\nProducts Interested: ${(c.products_interested || []).join(", ")}\nDeal Size: $${c.deal_size || 0}\nNotes: ${c.notes || "None"}\n\nWrite a professional, warm follow-up email. Include subject line. Keep it concise and action-oriented.`,

  proposal: (c) => `You are a sales proposal writer. Create a structured sales proposal:\n\nClient: ${c.name}\nCompany: ${c.company}\nIndustry: ${c.industry || "General"}\nProducts: ${(c.products_interested || []).join(", ")}\nDeal Size: $${c.deal_size || 0}\nBudget: $${c.budget || 0}\nNotes: ${c.notes || "None"}\n\nCreate a proposal with these sections:\n1. Executive Summary\n2. Client Overview\n3. Proposed Solution\n4. Pricing & Investment\n5. Key Benefits\n6. Next Steps / Call to Action\n\nMake it professional and persuasive.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, customer } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const promptFn = prompts[type];
    if (!promptFn) throw new Error(`Unknown type: ${type}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional AI sales assistant. Provide clear, actionable outputs." },
          { role: "user", content: promptFn(customer) },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "No output generated.";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sales-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
