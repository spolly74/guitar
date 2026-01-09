import { PracticeClient } from "@/app/(app)/practice/PracticeClient";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
        <p className="text-sm text-zinc-600">
          Generate a one-off lesson from a prompt. You can save it to Today when you like it.
        </p>
      </div>

      <PracticeClient />
    </div>
  );
}
