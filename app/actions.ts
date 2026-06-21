"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// --- Captures (the quick-capture inbox) --------------------------------

export async function addCapture(formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("captures").insert({ user_id: user.id, content });
  revalidatePath("/dashboard");
}

export async function archiveCapture(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("captures")
    .update({ status: "archived" })
    .eq("id", id);
  revalidatePath("/dashboard");
}

// Triage a capture straight into a task (the most common move).
export async function captureToTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!id || !content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: task } = await supabase
    .from("tasks")
    .insert({ user_id: user.id, title: content })
    .select("id")
    .single();

  await supabase
    .from("captures")
    .update({
      status: "triaged",
      converted_to: "task",
      converted_id: task?.id ?? null,
      triaged_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/dashboard");
}

// --- Tasks --------------------------------------------------------------

export async function toggleTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const done = String(formData.get("done") ?? "") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({
      status: done ? "done" : "open",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/dashboard");
}

// --- Task CRUD + scheduling (slice 2) -----------------------------------

export async function createTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const dueAt = String(formData.get("due_at") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("tasks").insert({
    user_id: user.id,
    title,
    due_at: dueAt || null,
  });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function updateTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const get = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };

  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({
      title: String(formData.get("title") ?? "").trim() || "Untitled",
      notes: get("notes"),
      priority: get("priority"), // 'low' | 'med' | 'high' | null
      project_id: get("project_id"),
      due_at: get("due_at"),
      is_all_day: String(formData.get("is_all_day") ?? "") === "true",
      recurrence: get("recurrence"),
    })
    .eq("id", id);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/plan");
}

export async function deleteTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/plan");
}

// Time-blocking: set (or clear) when you'll WORK on a task.
export async function scheduleTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const scheduledAt = String(formData.get("scheduled_at") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ scheduled_at: scheduledAt || null })
    .eq("id", id);
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

// --- Reminders ----------------------------------------------------------

export async function addReminder(formData: FormData) {
  const taskId = String(formData.get("task_id") ?? "");
  const offset = Number(formData.get("offset_minutes") ?? 0);
  if (!taskId || !offset) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("reminders").insert({
    user_id: user.id,
    task_id: taskId,
    offset_minutes: offset,
    channel: "email",
  });
  revalidatePath("/tasks");
}

export async function removeReminder(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("reminders").delete().eq("id", id);
  revalidatePath("/tasks");
}

// --- Writing ----------------------------------------------------------------

export async function addWritingIdea(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const get = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v === "" ? null : v; };
  await supabase.from("blog_posts").insert({
    user_id: user.id,
    title: get("title") ?? "Untitled",
    body: get("body"),
    stage: get("stage") ?? "idea",
    content_type: get("content_type") ?? "blog",
    target_date: get("target_date"),
    tags: [],
  });
  revalidatePath("/writing");
}

export async function updateWritingIdea(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const get = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v === "" ? null : v; };
  await supabase.from("blog_posts").update({
    title: get("title") ?? "Untitled",
    body: get("body"),
    stage: get("stage") ?? "idea",
    content_type: get("content_type") ?? "blog",
    target_date: get("target_date"),
  }).eq("id", id);
  revalidatePath("/writing");
}

export async function advanceWritingStage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id || !stage) return;
  const supabase = await createClient();
  await supabase.from("blog_posts").update({
    stage,
    ...(stage === "published" ? { published_at: new Date().toISOString() } : {}),
  }).eq("id", id);
  revalidatePath("/writing");
}

export async function deleteWritingIdea(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("blog_posts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/writing");
}

// AI expand idea — returns an outline. Needs ANTHROPIC_API_KEY in env.
export async function expandIdea(formData: FormData): Promise<{ outline: string } | { error: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const contentType = String(formData.get("content_type") ?? "blog");
  if (!title) return { error: "No title" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "No API key — add ANTHROPIC_API_KEY to .env.local" };

  const typeHints: Record<string, string> = {
    blog: "a blog post",
    linkedin: "a LinkedIn post (short, punchy, professional)",
    conference: "a conference paper or proposal",
    talk: "a conference talk abstract",
    newsletter: "a newsletter edition",
    other: "a written piece",
  };

  const prompt = `I want to write ${typeHints[contentType] ?? "a piece"} titled: "${title}"${body ? `\n\nInitial notes: ${body}` : ""}

Please give me:
1. A one-paragraph hook/intro
2. 4-6 key points or section headings with a one-line description each
3. A suggested closing thought

Keep it concise and practical. Format with clear headings.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { error: `API error ${res.status}` };
    const data = await res.json();
    const outline = data.content?.[0]?.text ?? "";
    return { outline };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// --- Ravelry sync -----------------------------------------------------------

export async function syncRavelry() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  try {
    const { fetchRavelryProjects, fetchRavelryFavorites } =
      await import("@/lib/ravelry");

    const [projects, favorites] = await Promise.all([
      fetchRavelryProjects(),
      fetchRavelryFavorites(),
    ]);

    const all = [...projects, ...favorites];
    if (all.length === 0) return { count: 0 };

    const rows = all.map((item) => ({
      user_id: user.id,
      title: item.title,
      kind: item.kind,
      status: item.status,
      source_url: item.source_url,
      image_url: item.image_url,
      yarn: item.yarn,
      notes: item.notes,
      external_id: item.external_id,
      external_source: "ravelry",
      tags: [] as string[],
    }));

    const { error } = await supabase
      .from("crochet_items")
      .upsert(rows, { onConflict: "user_id,external_source,external_id", ignoreDuplicates: false });

    if (error) return { error: error.message };

    revalidatePath("/crochet");
    return { count: all.length };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// --- Crochet ----------------------------------------------------------------

export async function addCrochetItem(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const get = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v === "" ? null : v; };
  await supabase.from("crochet_items").insert({
    user_id: user.id,
    title: get("title") ?? "Untitled",
    kind: get("kind") ?? "pattern",
    status: get("status") ?? "saved",
    source_url: get("source_url"),
    image_url: get("image_url"),
    pdf_url: get("pdf_url"),
    yarn: get("yarn"),
    hook_size: get("hook_size"),
    notes: get("notes"),
    pattern_id: get("pattern_id"),
  });
  revalidatePath("/crochet");
}

export async function updateCrochetItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const get = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v === "" ? null : v; };
  await supabase.from("crochet_items").update({
    title: get("title") ?? "Untitled",
    kind: get("kind") ?? "pattern",
    status: get("status") ?? "saved",
    source_url: get("source_url"),
    image_url: get("image_url"),
    pdf_url: get("pdf_url"),
    yarn: get("yarn"),
    hook_size: get("hook_size"),
    notes: get("notes"),
    pattern_id: get("pattern_id"),
  }).eq("id", id);
  revalidatePath("/crochet");
}

export async function deleteCrochetItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("crochet_items").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/crochet");
}

// --- Household staff --------------------------------------------------------

export async function addStaff(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const get = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };

  await supabase.from("staff").insert({
    user_id: user.id,
    name: String(formData.get("name") ?? "").trim() || "Unnamed",
    role: get("role"),
    phone: get("phone"),
    monthly_salary: get("monthly_salary") ? Number(get("monthly_salary")) : null,
    pay_day: get("pay_day") ? Number(get("pay_day")) : null,
    start_date: get("start_date"),
    notes: get("notes"),
  });
  revalidatePath("/staff");
}

export async function updateStaff(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();

  const get = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };

  await supabase.from("staff").update({
    name: String(formData.get("name") ?? "").trim() || "Unnamed",
    role: get("role"),
    phone: get("phone"),
    monthly_salary: get("monthly_salary") ? Number(get("monthly_salary")) : null,
    pay_day: get("pay_day") ? Number(get("pay_day")) : null,
    start_date: get("start_date"),
    notes: get("notes"),
    status: get("status") ?? "active",
  }).eq("id", id);
  revalidatePath("/staff");
  revalidatePath(`/staff/${id}`);
}

export async function deleteTransaction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const staffId = String(formData.get("staff_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("staff_transactions").delete().eq("id", id);
  revalidatePath("/staff");
  revalidatePath(`/staff/${staffId}`);
}

export async function addAbsence(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const staffId = String(formData.get("staff_id") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!staffId || !date) return;
  const note = String(formData.get("note") ?? "").trim() || null;
  await supabase.from("staff_absences").upsert(
    { user_id: user.id, staff_id: staffId, date, type: String(formData.get("type") ?? "casual"), note },
    { onConflict: "staff_id,date" }
  );
  revalidatePath(`/staff/${staffId}`);
}

export async function deleteAbsence(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const staffId = String(formData.get("staff_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("staff_absences").delete().eq("id", id);
  revalidatePath(`/staff/${staffId}`);
}

export async function logSalaryWithDeduction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const staffId = String(formData.get("staff_id") ?? "");
  if (!staffId) return;

  const get = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };

  const date = get("date") ?? new Date().toISOString().slice(0, 10);
  const method = get("method");
  const forMonth = get("for_month");
  const salaryAmount = Number(get("salary_amount") ?? 0);
  const deductAmount = Number(get("deduct_amount") ?? 0);

  // Insert both rows — salary paid + repayment deducted
  await supabase.from("staff_transactions").insert([
    {
      user_id: user.id,
      staff_id: staffId,
      date,
      type: "salary",
      amount: salaryAmount,
      method,
      for_month: forMonth,
      note: deductAmount > 0 ? `Paid ₹${salaryAmount}; ₹${deductAmount} deducted towards advance` : get("note"),
    },
    ...(deductAmount > 0 ? [{
      user_id: user.id,
      staff_id: staffId,
      date,
      type: "repayment" as const,
      amount: deductAmount,
      method,
      for_month: null,
      note: "Deducted from salary",
    }] : []),
  ]);

  revalidatePath("/staff");
  revalidatePath(`/staff/${staffId}`);
}

export async function logTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const staffId = String(formData.get("staff_id") ?? "");
  if (!staffId) return;

  const get = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };

  await supabase.from("staff_transactions").insert({
    user_id: user.id,
    staff_id: staffId,
    date: get("date") ?? new Date().toISOString().slice(0, 10),
    type: get("type") ?? "salary",
    amount: Number(get("amount") ?? 0),
    method: get("method"),
    for_month: get("for_month"),
    note: get("note"),
  });
  revalidatePath("/staff");
  revalidatePath(`/staff/${staffId}`);
}

// --- Meals (recipe library + meal plans) ------------------------------------

export async function addRecipe(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const get = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v === "" ? null : v; };
  const mealTypes = formData.getAll("meal_types").map(String).filter(Boolean);
  await supabase.from("recipes").insert({
    user_id: user.id,
    name: get("name") ?? "Untitled",
    meal_types: mealTypes.length > 0 ? mealTypes : ["lunch", "dinner"],
    cuisine: get("cuisine") ?? "south_indian",
    category: get("category") ?? "main",
    effort: get("effort") ?? "regular",
    is_veg: String(formData.get("is_veg") ?? "true") !== "false",
    notes: get("notes"),
    tags: [],
  });
  revalidatePath("/meals");
}

export async function updateRecipe(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const get = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v === "" ? null : v; };
  const mealTypes = formData.getAll("meal_types").map(String).filter(Boolean);
  await supabase.from("recipes").update({
    name: get("name") ?? "Untitled",
    meal_types: mealTypes.length > 0 ? mealTypes : ["lunch", "dinner"],
    cuisine: get("cuisine") ?? "south_indian",
    category: get("category") ?? "main",
    effort: get("effort") ?? "regular",
    is_veg: String(formData.get("is_veg") ?? "true") !== "false",
    notes: get("notes"),
  }).eq("id", id);
  revalidatePath("/meals");
}

export async function deleteRecipe(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("recipes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/meals");
}

export async function saveMealPlan(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const get = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v === "" ? null : v; };
  const date = get("date");
  if (!date) return;
  await supabase.from("meal_plans").upsert({
    user_id: user.id,
    date,
    breakfast: get("breakfast"),
    snacks: get("snacks"),
    lunch: get("lunch"),
    dinner: get("dinner"),
    notes: get("notes"),
  }, { onConflict: "user_id,date" });
  revalidatePath("/meals");
  revalidatePath("/dashboard");
}

export async function copyLastWeek() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Find last week's plans
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const mondayLastWeek = new Date(mondayThisWeek);
  mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const { data: lastWeek } = await supabase
    .from("meal_plans")
    .select("*")
    .gte("date", fmt(mondayLastWeek))
    .lt("date", fmt(mondayThisWeek))
    .order("date");

  if (!lastWeek || lastWeek.length === 0) return { error: "No plans from last week to copy" };

  const rows = lastWeek.map((plan) => {
    const oldDate = new Date(plan.date);
    const newDate = new Date(oldDate);
    newDate.setDate(oldDate.getDate() + 7);
    return {
      user_id: user.id,
      date: fmt(newDate),
      breakfast: plan.breakfast,
      snacks: plan.snacks,
      lunch: plan.lunch,
      dinner: plan.dinner,
      notes: plan.notes,
    };
  });

  await supabase.from("meal_plans").upsert(rows, { onConflict: "user_id,date" });
  revalidatePath("/meals");
  revalidatePath("/dashboard");
  return { count: rows.length };
}

export async function suggestMeals(formData: FormData): Promise<{ suggestions: Record<string, { breakfast?: string; lunch?: string; dinner?: string }> } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "No API key — add ANTHROPIC_API_KEY to .env.local" };

  // Fetch recipe library
  const { data: recipes } = await supabase
    .from("recipes")
    .select("name, meal_types, cuisine, category, effort, is_veg")
    .is("deleted_at", null);

  // Fetch recent 2 weeks of meal plans
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const { data: recentPlans } = await supabase
    .from("meal_plans")
    .select("date, breakfast, snacks, lunch, dinner")
    .gte("date", twoWeeksAgo.toISOString().slice(0, 10))
    .order("date");

  // Get the dates we need suggestions for (from formData)
  const datesStr = String(formData.get("dates") ?? "");
  const currentPlansStr = String(formData.get("current_plans") ?? "{}");

  const prompt = `You are a meal planning assistant for an Indian household. The family prefers Indian food (both South and North Indian).

${recipes && recipes.length > 0 ? `Here are dishes in their recipe library:\n${recipes.map(r => `- ${r.name} (${r.cuisine}, ${r.category}, ${r.effort}, ${r.is_veg ? "veg" : "non-veg"}, fits: ${(r.meal_types as string[]).join("/")})`).join("\n")}` : "They don't have a recipe library yet, so suggest common Indian home-cooked meals."}

${recentPlans && recentPlans.length > 0 ? `Recent meals (avoid repeating too soon):\n${recentPlans.map(p => `${p.date}: B=${p.breakfast || "?"} L=${p.lunch || "?"} D=${p.dinner || "?"}`).join("\n")}` : ""}

Please suggest meals for these dates, filling in gaps. Current plan (fill blanks only):
Dates: ${datesStr}
Current: ${currentPlansStr}

Return ONLY valid JSON in this exact format, no other text:
{"YYYY-MM-DD": {"breakfast": "dish names", "lunch": "dish names", "dinner": "dish names"}, ...}

Guidelines:
- For breakfast, suggest typical Indian breakfasts (idli, dosa, upma, poha, paratha, etc.)
- For lunch and dinner, suggest a complete Indian meal (e.g. "Dal Tadka, Aloo Gobi, Roti" or "Sambar, Beans Poriyal, Rice")
- Balance variety across the week
- Mix cuisines (South Indian, North Indian)
- Keep most meals vegetarian with occasional non-veg
- Only fill in meals that are currently blank/empty`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { error: `API error ${res.status}` };
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: "Could not parse AI response" };
    const suggestions = JSON.parse(jsonMatch[0]);
    return { suggestions };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
