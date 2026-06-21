// Hand-written types mirroring the SQL schema (migrations 0001 + 0002).
// When the project grows, generate these from the DB instead:
//   npx supabase gen types typescript --project-id <id> > lib/database.types.ts

export type TaskStatus = "open" | "done";
export type Priority = "low" | "med" | "high";

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: Priority | null;
  due_at: string | null;
  is_all_day: boolean;
  scheduled_at: string | null;
  recurrence: string | null;
  tags: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CaptureStatus = "inbox" | "triaged" | "archived";

export interface Capture {
  id: string;
  user_id: string;
  content: string;
  status: CaptureStatus;
  converted_to: "task" | "blog_post" | "book" | "crochet_item" | null;
  converted_id: string | null;
  created_at: string;
  triaged_at: string | null;
  deleted_at: string | null;
}

// A calendar event is NOT stored in our DB — this is the shape we map
// Google Calendar API results into when the integration lands.
export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
  location?: string;
}

export type ReminderChannel = "email" | "push" | "both";
export type ReminderStatus = "pending" | "sent" | "cancelled";

export interface Reminder {
  id: string;
  task_id: string;
  offset_minutes: number | null;
  remind_at: string | null;
  channel: ReminderChannel;
  status: ReminderStatus;
}

export interface Project {
  id: string;
  name: string;
  color: string | null;
  status: "active" | "archived";
}

// Task with its embedded reminders (Supabase nested select).
export type TaskWithReminders = Task & { reminders: Reminder[] };

// ─── Household ────────────────────────────────────────────────────────────────

export type StaffStatus = "active" | "inactive";
export type TxType = "salary" | "advance" | "repayment" | "bonus" | "reimbursement" | "deduction" | "other";
export type PayMethod = "cash" | "upi" | "bank" | "other";

export interface Staff {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  monthly_salary: number | null;
  pay_day: number | null;
  start_date: string | null;
  status: StaffStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StaffTransaction {
  id: string;
  user_id: string;
  staff_id: string;
  date: string;
  type: TxType;
  amount: number;
  method: PayMethod | null;
  for_month: string | null;
  note: string | null;
  created_at: string;
}

export interface StaffBalance {
  staff_id: string;
  user_id: string;
  advance_outstanding: number;
  last_salary_date: string | null;
}

export type AbsenceType = "sick" | "casual" | "holiday" | "other";

export interface StaffAbsence {
  id: string;
  user_id: string;
  staff_id: string;
  date: string;
  type: AbsenceType;
  note: string | null;
  created_at: string;
}

export type StaffWithBalance = Staff & {
  advance_outstanding: number;
  last_salary_date: string | null;
};

// ─── Writing ─────────────────────────────────────────────────────────────────

export type WritingStage = "idea" | "outlining" | "drafting" | "editing" | "published";
export type ContentType = "blog" | "linkedin" | "conference" | "talk" | "newsletter" | "other";

export interface BlogPost {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  stage: WritingStage;
  content_type: ContentType;
  tags: string[];
  target_date: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── Crochet ─────────────────────────────────────────────────────────────────

export type CrochetKind = "pattern" | "idea" | "project";
export type CrochetStatus = "saved" | "queued" | "making" | "finished";

export interface CrochetItem {
  id: string;
  user_id: string;
  title: string;
  kind: CrochetKind;
  status: CrochetStatus;
  source_url: string | null;
  notes: string | null;
  yarn: string | null;
  hook_size: string | null;
  image_url: string | null;
  pattern_id: string | null;
  tags: string[];
  pdf_url: string | null;
  external_id: string | null;
  external_source: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── Meals ──────────────────────────────────────────────────────────────────

export type MealType = "breakfast" | "snacks" | "lunch" | "dinner";
export type Cuisine = "south_indian" | "north_indian" | "maharashtrian" | "continental" | "chinese_indian" | "other";
export type RecipeCategory = "dal" | "sabzi" | "rice" | "roti" | "curry" | "snack" | "sweet" | "main" | "side" | "breakfast" | "chutney" | "raita" | "other";
export type Effort = "quick" | "regular" | "elaborate";

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  meal_types: MealType[];
  cuisine: Cuisine;
  category: RecipeCategory;
  effort: Effort;
  is_veg: boolean;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MealPlan {
  id: string;
  user_id: string;
  date: string;
  breakfast: string | null;
  snacks: string | null;
  lunch: string | null;
  dinner: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
