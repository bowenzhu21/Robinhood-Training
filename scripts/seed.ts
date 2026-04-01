import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const trainingQuestionSchema = z.object({
  module_title: z.string().min(1),
  module_description: z.string().min(1),
  category: z.string().min(1),
  difficulty: z.string().min(1),
  question_text: z.string().min(1),
  benchmark_answer: z.string().min(1),
  rubric: z.array(z.string())
});

const trainingQuestionsSchema = z.array(trainingQuestionSchema);

type TrainingQuestion = z.infer<typeof trainingQuestionSchema>;
type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
};

function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

async function main() {
  loadEnvConfig(process.cwd());

  const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"));
  const seedFilePath = path.join(process.cwd(), "training-questions.json");
  const raw = await readFile(seedFilePath, "utf8");
  const questions = trainingQuestionsSchema.parse(JSON.parse(raw)) as TrainingQuestion[];

  const modulesByTitle = new Map<
    string,
    {
      title: string;
      description: string;
      questions: TrainingQuestion[];
    }
  >();

  for (const question of questions) {
    const existing = modulesByTitle.get(question.module_title);

    if (existing) {
      existing.questions.push(question);
      continue;
    }

    modulesByTitle.set(question.module_title, {
      title: question.module_title,
      description: question.module_description,
      questions: [question]
    });
  }

  let createdModules = 0;
  let createdQuestions = 0;
  let skippedQuestions = 0;

  for (const moduleData of modulesByTitle.values()) {
    const { data: existingModule, error: existingModuleError } = await supabase
      .from("modules")
      .select("id, title, description")
      .eq("title", moduleData.title)
      .single();

    if (existingModuleError && existingModuleError.code !== "PGRST116") {
      throw new Error(`Failed to look up module "${moduleData.title}": ${existingModuleError.message}`);
    }

    let moduleRow = existingModule as ModuleRow | null;

    if (!moduleRow) {
      const { data: insertedModule, error: insertModuleError } = await supabase
        .from("modules")
        .insert({
          title: moduleData.title,
          description: moduleData.description
        })
        .select("id, title, description")
        .single();

      if (insertModuleError || !insertedModule) {
        throw new Error(`Failed to create module "${moduleData.title}": ${insertModuleError?.message}`);
      }

      moduleRow = insertedModule as ModuleRow;
      createdModules += 1;
    }

    const { data: existingQuestions, error: existingQuestionsError } = await supabase
      .from("questions")
      .select("question_text")
      .eq("module_id", moduleRow.id);

    if (existingQuestionsError) {
      throw new Error(`Failed to load existing questions for "${moduleData.title}": ${existingQuestionsError.message}`);
    }

    const existingQuestionTexts = new Set(
      (existingQuestions ?? []).map((question) => String(question.question_text).trim().toLowerCase())
    );

    const seenInFile = new Set<string>();
    const rowsToInsert: Array<{
      module_id: string;
      question_text: string;
      benchmark_answer: string;
      rubric: string[];
      order_index: number;
    }> = [];

    moduleData.questions.forEach((question, index) => {
      const normalizedQuestionText = question.question_text.trim().toLowerCase();

      if (existingQuestionTexts.has(normalizedQuestionText) || seenInFile.has(normalizedQuestionText)) {
        skippedQuestions += 1;
        return;
      }

      seenInFile.add(normalizedQuestionText);

      rowsToInsert.push({
        module_id: moduleRow.id,
        question_text: question.question_text,
        benchmark_answer: question.benchmark_answer,
        rubric: question.rubric,
        order_index: index + 1
      });
    });

    if (!rowsToInsert.length) {
      continue;
    }

    const { error: insertQuestionsError } = await supabase.from("questions").insert(rowsToInsert);

    if (insertQuestionsError) {
      throw new Error(`Failed to insert questions for "${moduleData.title}": ${insertQuestionsError.message}`);
    }

    createdQuestions += rowsToInsert.length;
  }

  console.log(`Seed complete.
Modules created: ${createdModules}
Questions inserted: ${createdQuestions}
Duplicate questions skipped: ${skippedQuestions}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
