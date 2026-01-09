import { PlanV1Schema } from "@/lib/plan/schema";

// v1 "Lesson" is structurally identical to our existing Plan schema.
// We keep this alias to allow the UI/API to speak in "lesson" terms without
// changing the underlying persisted schema or DB naming in v1.
export const LessonV1Schema = PlanV1Schema;

export type LessonV1 = import("@/lib/plan/schema").PlanV1;
