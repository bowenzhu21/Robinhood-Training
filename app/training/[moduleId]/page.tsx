import { notFound } from "next/navigation";

import { TopNav } from "@/components/top-nav";
import { TrainingSession } from "@/components/training-session";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getLatestAttemptsForModule, getModules, getQuestionsByModule } from "@/lib/data";

type TrainingPageProps = {
  params: Promise<{
    moduleId: string;
  }>;
};

export default async function TrainingPage({ params }: TrainingPageProps) {
  const user = await requireUser();
  await ensureProfile(user);

  const { moduleId } = await params;
  const [modules, questions, attempts] = await Promise.all([
    getModules(),
    getQuestionsByModule(moduleId),
    getLatestAttemptsForModule(user.id, moduleId)
  ]);

  const module = modules.find((item) => item.id === moduleId);

  if (!module || questions.length === 0) {
    notFound();
  }

  const completedQuestionIds = attempts.map((attempt) => attempt.question_id);
  const nextQuestionIndex = questions.findIndex((question) => !completedQuestionIds.includes(question.id));
  const initialQuestionIndex = nextQuestionIndex === -1 ? questions.length - 1 : nextQuestionIndex;

  return (
    <div>
      <TopNav currentPath="/modules" />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <TrainingSession
          moduleId={moduleId}
          moduleTitle={module.title}
          moduleDescription={module.description}
          questions={questions}
          initialQuestionIndex={initialQuestionIndex}
          completedQuestionIds={completedQuestionIds}
        />
      </main>
    </div>
  );
}
