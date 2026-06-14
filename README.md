# AI-Driven Gamified Skill-Tree Learning System

This project is a full-stack prototype for an AI-driven, gamified skill-tree learning system for self-directed learning. It was developed as part of a BSc Computer Science dissertation project.

The system helps learners turn a broad learning goal into a structured prerequisite graph, complete node-level quizzes, receive AI tutoring support, and review quantitative learning metrics such as DAG validity, quiz performance, path similarity, EXP, badges, and RAG usage.

## Project Goals

The project implements three main tiers:

1. **Core learning infrastructure**
   - User registration and login with JWT authentication.
   - Persistent learner profiles and skill-tree state.
   - AI-generated skill trees represented as directed acyclic graphs.
   - Prerequisite-based node locking and unlocking.

2. **Personalised learning support**
   - Retrieval-augmented generation over uploaded PDF material.
   - Persistent quiz mistake memory.
   - Context-aware AI chat using skill-tree progress, uploaded material, and previous mistakes.
   - Graceful degradation when retrieval services are unavailable.

3. **Evaluation and gamification**
   - LCS-based path similarity analysis.
   - EXP, level, streak, and badge feedback.
   - Evaluation dashboard for structure quality, learning process, RAG, and gamification metrics.
   - Automated evaluation scripts that exercise the real API workflow.

## Tech Stack

### Frontend

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Element Plus
- Vue Flow

### Backend

- NestJS
- TypeScript
- MongoDB with Mongoose
- JWT authentication
- LangChain
- DeepSeek-compatible chat model API
- OpenAI embeddings
- Qdrant vector store
- PDF parsing for uploaded learning material

## Repository Structure

```text
project/
  backend/       NestJS API, AI, RAG, skill-tree logic, evaluation scripts
  frontend/      Vue application and evaluation dashboard
  docker-compose.yml
  README.md
  README-中文.md
```

## Environment Variables

Create a `.env` file in `project/backend/` for local backend development, or provide equivalent variables in the deployment environment.

Required variables:

```env
MONGODB_URI=
JWT_SECRET=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
```

Common optional variables:

```env
PORT=3000
JWT_EXPIRES_IN=7d
DEEPSEEK_MODEL=deepseek-chat
QDRANT_URL=http://localhost:6333
CORS_ORIGIN=http://localhost:5173
```

For `docker-compose.yml`, the same variables can be supplied from the root `.env` file or the host environment.

## Local Development

Install dependencies separately for the backend and frontend.

```bash
cd backend
npm install

cd ../frontend
npm install
```

Start the backend:

```bash
cd backend
npm run start:dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`

## Main User Flow

1. Register or log in.
2. Create a skill tree by entering a learning goal and current level.
3. Optionally upload a PDF document as reference material.
4. Wait for the AI-generated skill tree to become ready.
5. Open available nodes and complete quizzes.
6. Failed quiz answers are stored as learning memory.
7. Passing a quiz completes the node, unlocks later nodes, grants EXP, and may unlock badges.
8. Use the AI chat panel for contextual tutoring.
9. Open the evaluation page to inspect system metrics and export data.

## Evaluation Workflow

The backend includes an automated evaluation runner that interacts with the real API instead of inserting fake database records directly.

Before running it, make sure the backend service and its dependencies are available.

Run the automated evaluation:

```bash
cd backend
npm run eval:run
```

Generate a Markdown report from the latest JSON result:

```bash
npm run eval:report
```

Results are written to:

```text
backend/evaluation-results/
```

The frontend evaluation page also supports exporting CSV and JSON summaries.

## Useful Commands

Backend:

```bash
npm run build
npm run test
npm run eval:run
npm run eval:report
```

Frontend:

```bash
npm run build
npm run dev
```

## Notes on Data Reliability

Quiz generation uses server-side quiz sessions. The frontend receives the questions and a `quizSessionId`, but the backend uses its stored session data for scoring. This prevents client-side modification of correct answers from affecting quiz scores, EXP, badges, and evaluation metrics.

Uploaded PDFs are parsed into text chunks and stored in the vector store for retrieval. If Qdrant or embedding services are temporarily unavailable, the core learning flow can continue without crashing.

## Dissertation Relevance

The implementation directly supports the dissertation themes:

- **Micro-learning:** learning goals are decomposed into small skill nodes.
- **Gamification:** progress, EXP, levels, badges, and visual node feedback support motivation.
- **AI scaffolding:** generated skill trees and tutoring chat provide adaptive guidance.
- **Knowledge graph structure:** prerequisite relationships are represented as a DAG.
- **Quantitative evaluation:** LCS path similarity and dashboard metrics provide data for analysis.
