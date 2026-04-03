# Customer Service Training MVP

Beta version for written evaluations.

This app is currently the beta release of the customer service training platform and is intended for written evaluations. It provides response-writing assessments, AI grading, and progress tracking for the evaluation workflow.

A premium dark internal training app for customer support agents built with Next.js App Router, TypeScript, Tailwind CSS, Supabase, and the Gemini API.

## What the app does

- Email/password login with Supabase Auth
- Dashboard with overall completion, average score, and next module resume state
- Modules library with progress-aware training cards
- One-question-at-a-time training flow
- Server-side Gemini grading with structured JSON feedback
- Saved attempts and progress tracking in Supabase
- Seed script for loading `training-questions.json` into Supabase

## Current training rules

- Questions are graded on a `0-100` scale
- `80` and above counts as a pass
- A question is only considered completed once the trainee passes it
- The trainee cannot move to the next question until the current question passes
- If a trainee revisits a previously answered question, the latest saved grading result is restored when available

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Gemini API
- Vercel-friendly route handlers

## Getting started

1. Change into the project folder:

```bash
cd customer-service-training
```

2. Install dependencies:

```bash
npm install
```

3. Create `customer-service-training/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`

`GEMINI_MODEL` is optional. The app defaults to `gemini-2.5-flash`.

## Live deployment

Production URL:

- `https://robinhood-training.vercel.app/`

## Important environment notes

- `SUPABASE_SERVICE_ROLE_KEY` must be the real Supabase `service_role` key, not another anon key
- If you add or change env vars, restart the Next.js dev server
- Gemini is called server-side only; secrets are never sent to the browser

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run seed
```

## Seed the database

The seed script reads `./training-questions.json` from the project root.

Run it with:

```bash
npm run seed
```

What it does:

- groups records by `module_title`
- creates a module if it does not already exist
- inserts related questions for that module
- skips exact duplicate question text already in the database
- skips exact duplicate question text repeated inside the JSON file
- stores `rubric` as an array so it lands correctly in a `jsonb` column

The script expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If seeding fails with a row-level security error, the usual cause is that `SUPABASE_SERVICE_ROLE_KEY` is not actually a service-role key.

## Expected `training-questions.json` shape

```json
[
  {
    "module_title": "Account Access and Login Support",
    "module_description": "Handling login, verification, and account access concerns with clear security-focused guidance.",
    "category": "account_access",
    "difficulty": "easy",
    "question_text": "A customer says they forgot their password and can no longer access their account. How should you respond?",
    "benchmark_answer": "A strong response should acknowledge the issue, explain how to use the secure password reset flow, remind the customer not to share credentials, and set expectations for what to do if the reset email does not arrive or they remain locked out.",
    "rubric": [
      "shows empathy",
      "directs the customer to the secure reset process",
      "avoids asking for sensitive credentials"
    ]
  }
]
```

## Supabase schema notes

The app is intentionally tolerant of a leaner MVP schema, but these are the most useful columns to have.

### `profiles`

Minimum:

- `id`

Helpful optional columns:

- `email`
- `full_name`

### `modules`

Minimum:

- `id`
- `title`
- `description`

### `questions`

Minimum:

- `id`
- `module_id`
- `question_text`
- `benchmark_answer`
- `rubric`
- `order_index`

### `attempts`

Minimum:

- `user_id`
- `question_id`
- `score`
- `created_at`

At least one raw response column is strongly recommended:

- `response_text`
- or `trainee_answer`

Helpful optional grading-detail columns:

- `passed`
- `rubric_scores`
- `strengths`
- `missed_points`
- `feedback_to_agent`
- `ideal_rewrite`
- `module_id`

### `module_progress`

Minimum:

- `user_id`
- `module_id`

Helpful optional columns:

- `completed_questions`
- `total_questions`
- `average_score`
- `last_question_id`
- `status`
- `last_attempted_at`
- `completed_at`

Recommended unique constraints:

- `modules(title)`
- `questions(module_id, question_text)`
- `module_progress(user_id, module_id)`

## How grading works

The browser sends only:

- `moduleId`
- `questionId`
- `traineeAnswer`

The server then:

1. loads `question_text`, `benchmark_answer`, and `rubric` from Supabase
2. sends those fields plus `traineeAnswer` to Gemini
3. validates the JSON response
4. saves the attempt
5. recalculates module progress
6. returns structured feedback to the client

Gemini is prompted to:

- grade fairly
- not punish different wording if the meaning is correct
- prioritize empathy, professionalism, clarity, factual accuracy, and next steps
- return valid JSON only

Expected grading shape:

```json
{
  "score": 88,
  "passed": true,
  "rubric_scores": {},
  "strengths": [],
  "missed_points": [],
  "feedback_to_agent": "",
  "ideal_rewrite": ""
}
```

If Gemini returns invalid JSON, the app falls back to a friendly safe response instead of crashing the UI.

## Main routes

- `/login`
- `/dashboard`
- `/modules`
- `/training/[moduleId]`
- `/api/grade`

## Deployment

This app is structured for Vercel deployment:

- App Router pages
- Route handlers under `app/api`
- server-side Gemini grading
- no secret keys exposed to the browser

Add the same environment variables in Vercel before deploying.

## Troubleshooting

### Missing public env vars in the browser

If you see an error about `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`, make sure they exist in `customer-service-training/.env.local` and restart the dev server.

### Seed script fails with RLS

Check that `SUPABASE_SERVICE_ROLE_KEY` is the actual service-role key from Supabase project settings.

### Questions or progress look wrong

This app treats a question as completed only when the latest score for that question is `80` or higher.
