# Customer Service Training MVP

A clean internal training app for support agents built with Next.js App Router, TypeScript, Tailwind CSS, Supabase, and the Gemini API.

## What this MVP does

- Email/password login with Supabase Auth
- Dashboard with module progress and average score
- Modules library with simple cards
- Training flow with one question at a time
- Server-side Gemini grading
- Attempt saving and module progress tracking in Supabase
- Seed script for loading `training-questions.json` into Supabase

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Gemini API
- Vercel-friendly route handlers

## Environment variables

Create a `.env.local` file inside `customer-service-training`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_MODEL` is optional. The app defaults to `gemini-2.5-flash`.

## Expected Supabase columns

This project assumes these columns already exist:

- `profiles`: `id`, `email`, `full_name`
- `modules`: `id`, `title`, `description`, `category`, `difficulty`
- `questions`: `id`, `module_id`, `question_text`, `benchmark_answer`, `rubric`, `difficulty`, `order_index`
- `attempts`: `id`, `user_id`, `module_id`, `question_id`, `trainee_answer`, `score`, `passed`, `rubric_scores`, `strengths`, `missed_points`, `feedback_to_agent`, `ideal_rewrite`, `created_at`
- `module_progress`: `user_id`, `module_id`, `completed_questions`, `total_questions`, `average_score`, `last_question_id`, `status`, `last_attempted_at`, `completed_at`

Recommended unique constraints:

- `modules(title)`
- `questions(module_id, question_text)`
- `module_progress(user_id, module_id)`

## Getting started

1. Change into the project folder:

```bash
cd customer-service-training
```

2. Install dependencies:

```bash
npm install
```

3. Start the local app:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Seed the database

The seed script reads `./training-questions.json` from the project root.

Run it with:

```bash
npm run seed
```

What the script does:

- Groups rows by `module_title`
- Checks whether each module already exists by title
- Creates the module if it does not exist
- Loads existing questions for that module
- Inserts only new questions for that module
- Skips exact duplicate question text within the database and within the same seed file
- Stores `rubric` as a JSON array so it lands in a `jsonb` column correctly

Expected file shape:

```json
[
  {
    "module_title": "Handling Refund Requests",
    "module_description": "Basic refund and order issue handling",
    "category": "refunds",
    "difficulty": "easy",
    "question_text": "A customer says they were charged twice for the same order. How should you respond?",
    "benchmark_answer": "A strong response should acknowledge the issue, apologize, confirm the order details, explain that you will review the duplicate charge, and provide the next steps or escalation path.",
    "rubric": ["shows empathy", "apologizes clearly", "confirms order details"]
  }
]
```

Notes:

- The script uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Run it from inside `customer-service-training`
- If your `rubric` column is `jsonb`, passing the rubric array will store it correctly

## How grading works

The browser sends only:

- `moduleId`
- `questionId`
- `traineeAnswer`

The server route:

1. Looks up the real question, benchmark answer, and rubric from Supabase
2. Sends them to Gemini on the server
3. Validates the returned JSON
4. Saves the attempt
5. Updates module progress
6. Returns feedback to the client

This keeps benchmark answers and API keys out of the browser.

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
- No secret keys exposed to the client
- Server-side Gemini grading

Add the same environment variables in Vercel before deploying.
