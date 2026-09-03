# Cinevora

**Agentic production recovery platform for film and TV productions.**

![License](https://img.shields.io/badge/License-MIT-D85A30?style=flat-square&labelColor=2C2C2A)
![Built with Gemini](https://img.shields.io/badge/Built%20with-Gemini-378ADD?style=flat-square&labelColor=2C2C2A)
![Agents](https://img.shields.io/badge/Agents-Google%20ADK-639922?style=flat-square&labelColor=2C2C2A)
![Search](https://img.shields.io/badge/Search-Parallel-7F77DD?style=flat-square&labelColor=2C2C2A)

Cinevora coordinates a team of Gemini agents to turn a production disruption into a clear evidence backed recovery plan. Things like severe weather , a lost location or unavailable equipment. A deterministic decision engine scores every candidate strategy , enforces a hard safety gate and requires explicit human approval before anything is committed.

Built for the **Agentic Cinema Blockbuster Hackathon** Parallel track.

**Live demo:** https://cinevora-sooty.vercel.app


**Backend API:** https://cinevora-qad4.onrender.com

> Note :  the backend runs on Render's free tier which spins down after inactivity. The first request after sitting idle may take 30 to 60 seconds while the server wakes up. Requests after that are fast.

---

## What it does

When a production manager reports a disruption Cinevora does the following.

1. Sends the disruption to three specialist agents that work at the same time. **Scheduling**, **Resource and Logistics**, and **Location and Budget**. Each one looks at the problem from its own angle.
2. The **Location and Budget** agent calls the [Parallel](https://parallel.ai) search API directly to find real alternative filming locations. This means recommendations come from live web data instead of whatever the model remembers from training.
3. A **Producer agent** takes the three specialist findings and combines them into one recovery recommendation, with evidence behind every claim it makes.
4. A **deterministic decision engine** written in plain Python with no model calls generates candidate strategies scores each one across six weighted factors and applies a **safety gate**. If a strategy would put the crew at risk it gets rejected no matter what the language model thinks of it.
5. Every strategy Cinevora looked at gets shown to the user including the ones it rejected. Nothing gets hidden.
6. Nothing executes on its own. A production manager reviews the full evidence trail and either approves the plan or asks for a revision.

## Why it's built this way

The parts of Cinevora that need to be trustworthy are safety enforcement scoring and ranking. Those are written as regular deterministic code not model output. The language model is used for what it does well, synthesis and reasoning grounded in evidence it actually retrieved. This means the safety gate can't be talked around by clever prompting and the scoring logic can be read directly in `decision_engine.py` instead of trusted blindly.

Every piece of evidence behind a recommendation is tagged by where it came from. Production data a live web search or the agent's own reasoning. It also gets a confidence level. A recommendation backed by well sourced high confidence evidence scores higher than one built on guesses. The system rewards real certainty not confident sounding language.

## Architecture
<img width="2720" height="3352" alt="cinevora_agent_architecture_v4" src="https://github.com/user-attachments/assets/97d3a835-5829-4afc-a2a6-169bf9a514b7" />


**Frontend** built in Next.js. Five pages, Overview, Schedule, Resources, Locations, and Budget, all sharing one React context so a generated plan looks the same no matter which page you're on.

## Screenshots

### Recovery decision, scored and backed by evidence

<img width="1186" height="910" alt="image" src="https://github.com/user-attachments/assets/c8beb632-1087-441a-9ddd-c9039f0fe4be" />


### Every option considered, including the ones rejected

<img width="1173" height="523" alt="image" src="https://github.com/user-attachments/assets/a5232621-2362-4489-8a93-5c28445face4" />


### Why Cinevora reached this decision

<img width="1177" height="772" alt="image" src="https://github.com/user-attachments/assets/d1957ad4-ad86-463a-87c9-60e86918714f" />

<img width="1181" height="910" alt="image" src="https://github.com/user-attachments/assets/e61db21a-1314-4677-a411-022971b3c5d6" />


### The same plan, consistent on every page

<img width="1897" height="815" alt="image" src="https://github.com/user-attachments/assets/c7e4cc83-3f7d-417d-a79b-0ca55f3dea4b" />
<img width="1882" height="632" alt="image" src="https://github.com/user-attachments/assets/e67399cb-1fdc-4be1-8985-edfcba2010c4" />



<img width="1893" height="841" alt="image" src="https://github.com/user-attachments/assets/db5f6fe6-8088-4b50-8ce9-3bdd30c2c32a" />
<img width="1901" height="566" alt="image" src="https://github.com/user-attachments/assets/0c13fb31-d5d8-4df4-976a-bc2c1d7f9c01" />

## Tech stack

- **Backend:** Python, FastAPI, [Google Agent Development Kit (ADK)](https://google.github.io/adk-docs/), Gemini 2.5 Flash
- **Search and grounding:** [Parallel](https://parallel.ai) search API
- **Validation:** Pydantic
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Deployment:** Render for the backend, Vercel for the frontend
- **Package management:** `uv`

## Running locally

### Backend

```bash
git clone https://github.com/subanaash/cinevora.git
cd cinevora
uv sync
```

Create a `.env` file in the repo root.

GEMINI_API_KEY=your_gemini_api_key

PARALLEL_API_KEY=your_parallel_api_key


Run the server.

```bash
uv run uvicorn backend.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`.

NEXT_PUBLIC_API_URL=http://127.0.0.1:8000


Run the dev server.

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Project structure
```
cinevora/
├── backend/
│ ├── main.py                # FastAPI app, API routes
│ ├── workflow.py            # Agent orchestration, plan synthesis
│ ├── decision_engine.py     # Deterministic scoring, safety gate
│ ├── agent.py               # Specialist agent definitions, Parallel tool
│ └── models.py              # Pydantic schemas
├── frontend/
│ ├── app/
│ │ ├── page.tsx             # Overview / command center
│ │ ├── schedule/            # Schedule view
│ │ ├── resources/           # Resources view
│ │ ├── locations/           # Locations view
│ │ └── budget/              # Budget view
│ └── src/lib/
│ ├── api.ts                     # Backend API client
│ └── RecoveryPlanContext.tsx    # Shared cross-page state
├── docs/
│ └── screenshots/               # Images referenced in this README
└── LICENSE

```

## Known limitations

- The backend's free-tier hosting spins down after inactivity, as noted above.
- LLM output naturally varies between runs even on identical input. The decision score for a given scenario can shift by a point or so between generations depending on how confidently the agents phrase their findings. This is expected behavior rather than a bug. The scoring reflects the actual evidence quality of that specific run instead of caching one fixed answer.
- The revision request flow currently updates the plan's status but does not yet trigger a full re-analysis.

## What's next

Adding more disruption types beyond weather and locations, things like crew conflicts, permit delays, and equipment failures, each with its own specialist agent. Also planning a what-if mode, where a production manager could change one assumption, like a lower budget or an earlier deadline, and watch the recommendation and its score update in response.

## License

This project is open source under the [MIT License](./LICENSE).
