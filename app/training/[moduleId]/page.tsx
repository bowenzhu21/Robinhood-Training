import { notFound } from "next/navigation";

import { TopNav } from "@/components/top-nav";
import { TrainingSession } from "@/components/training-session";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getAttemptHistoryForModule, getModules, getQuestionsByModule } from "@/lib/data";

type TrainingPageProps = {
  params: Promise<{
    moduleId: string;
  }>;
};

export default async function TrainingPage({ params }: TrainingPageProps) {
  const user = await requireUser();
  await ensureProfile(user);

  const { moduleId } = await params;
  const [modules, questions, attemptHistory] = await Promise.all([
    getModules(),
    getQuestionsByModule(moduleId),
    getAttemptHistoryForModule(user.id, moduleId)
  ]);

  const module = modules.find((item) => item.id === moduleId);

  if (!module || questions.length === 0) {
    notFound();
  }

  const passedQuestionIds = Array.from(
    new Set(attemptHistory.filter((attempt) => attempt.passed).map((attempt) => attempt.question_id))
  );
  const nextQuestionIndex = questions.findIndex((question) => !passedQuestionIds.includes(question.id));
  const initialQuestionIndex = nextQuestionIndex === -1 ? questions.length - 1 : nextQuestionIndex;

  return (
    <div>
      <TopNav currentPath="/modules" />

      <main className="page-shell py-10">
        <TrainingSession
          moduleId={moduleId}
          moduleTitle={module.title}
          moduleDescription={module.description}
          questions={questions.map((question) => ({
            id: question.id,
            question_text: question.question_text,
            order_index: question.order_index
          }))}
          initialQuestionIndex={initialQuestionIndex}
          initialAttempts={attemptHistory.map((attempt) => ({
            questionId: attempt.question_id,
            score: attempt.score,
            passed: attempt.passed,
            result: attempt.result,
            responseText: attempt.response_text,
            createdAt: attempt.created_at
          }))}
        />
      </main>
    </div>
  );
}
