# AI-Powered EMR: Routing Graph (v2)

Hackathon build only: no scaling, caching or queues. Each database is shown as a single node.

Changes from v1 (`system-design-routing.md`):

- **Snowflake is called through its REST API, not MCP.** The Snowflake MCP server is gone. `search_guidelines` is a plain Gemini function tool that sends a Cortex Search REST query with `httpx` and passes only a de-identified clinical description. The eligibility endpoint calls the same REST API.

Changes from draft-1:

- **No Dictate/Ask toggle.** There's one mic, and typed web chat goes to the same place. Every request works like Ask did: Gemini figures out what the doctor wants and routes it. Nothing writes to the chart directly. Chart updates become suggestions the doctor approves.
- **No autonomous AI.** Agents run only when the doctor asks. The nightly reminder-agent job is gone, and an approval no longer triggers the reminder agent on its own. SMS sending is still scheduled because it's plain code, not AI.
- **Patient-data tools are MCP.** Every time an agent reads or proposes something in Tiger, it goes through the EMR MCP server. Those calls are the **thick arrows**.

How to read it:

- **Yellow dashed box**: a decision. It points into the subgraph with the same name.
- **Orange node**: an MCP server. **Thick arrow**: an MCP tool call.
- **Blue cylinder**: a database.
- **Arrow labeled "REST"**: a direct HTTP call to Snowflake, with no MCP in between.

```mermaid
flowchart LR
  classDef decision fill:#fff3bf,stroke:#f08c00,stroke-width:2px,stroke-dasharray:5 3,color:#000
  classDef mcp fill:#ffd8a8,stroke:#e8590c,stroke-width:3px,color:#000
  classDef db fill:#d0ebff,stroke:#1c7ed6,color:#000
  classDef ext fill:#e9ecef,stroke:#495057,color:#000
  classDef actor fill:#e5dbff,stroke:#7048e8,color:#000

  Doc(["Doctor"]):::actor
  Pt(["Patient"]):::actor
  Web["Web dashboard<br/>3D body, timeline, chat, approval queue"]
  App["Expo app<br/>one mic, camera, approvals"]

  subgraph API ["FastAPI"]
    body["GET /patients/id/body-state<br/>GET /patients/id/regions/region"]
    req["POST /requests<br/>voice or typed"]
    docs["POST /documents<br/>photo of a lab report"]
    sugg["GET /suggestions<br/>POST /suggestions - add to plan<br/>POST /suggestions/approve, /reject"]
    rem["PUT /patients/id/reminders/rid<br/>doctor edits a reminder"]
    runrem["POST /demo/run-reminders<br/>APScheduler or demo button"]
    twhook["POST /webhooks/twilio<br/>delivery status, STOP replies"]
    elig["POST /patients/id/eligibility<br/>stretch"]

    D1box["D1: Voice or typed?"]:::decision
    subgraph D1 ["D1: Voice or typed?"]
      D1q{"Did the request come in as audio?"}
    end

    D2box["D2: Request type"]:::decision
    subgraph D2 ["D2: Request type"]
      D2q{"Gemini classifies:<br/>what does the doctor want?"}
    end

    chart["Chart-update agent"]
    research["Research agent"]
    screen["Screening agent"]

    D3box["D3: Approved item is a note?"]:::decision
    subgraph D3 ["D3: Approved item is a note?"]
      D3q{"Is the approved suggestion a note?"}
    end

    D4box["D4: Due and opted in?"]:::decision
    subgraph D4 ["D4: Due and opted in?"]
      D4q{"Reminder due and patient opted in?"}
    end

    D5box["D5: Prior-auth question?"]:::decision
    subgraph D5 ["D5: Prior-auth question?"]
      D5q{"Does the order raise a prior-auth question?"}
    end
  end

  EMRMCP["EMR MCP server - ours<br/>get_patient_context<br/>search_patient_notes<br/>propose_change"]:::mcp

  Tiger[("Tiger Data")]:::db
  Snow[("Snowflake<br/>Cortex Search REST API<br/>guidelines, PubMed, payer policies")]:::db
  Files[("File storage")]:::db

  Gemini["Gemini API"]:::ext
  EL["ElevenLabs<br/>Scribe STT + TTS"]:::ext
  Twilio["Twilio SMS"]:::ext
  Stedi["Stedi test mode"]:::ext

  %% Clients
  Doc --> Web
  Doc --> App
  Web --> body
  Web --> req
  Web --> sugg
  Web --> rem
  Web --> elig
  App --> req
  App --> docs
  App --> sugg

  %% 3D body view
  body --> Tiger

  %% One entry point for every request
  req --> D1box
  D1box --> D1
  D1q -->|"yes: speech-to-text"| EL
  D1q -->|"no"| D2box
  EL -->|"transcript"| D2box
  D2box --> D2
  D2q -.->|"classify"| Gemini
  D2q -->|"update the chart"| chart
  D2q -->|"clinical question"| research
  D2q -->|"check screenings"| screen

  %% Agents: model calls
  chart -.-> Gemini
  research -.-> Gemini
  screen -.-> Gemini

  %% Agents: MCP tool calls
  chart ==>|"MCP: get_patient_context,<br/>propose_change"| EMRMCP
  research ==>|"MCP: get_patient_context,<br/>search_patient_notes"| EMRMCP
  screen ==>|"MCP: get_patient_context,<br/>propose_change"| EMRMCP
  EMRMCP --> Tiger

  %% Agents: Snowflake over REST, no MCP
  research -->|"REST: search_guidelines"| Snow
  screen -->|"REST: search_guidelines"| Snow

  %% Replies
  chart -->|"read-back if voice"| EL
  research -->|"summary if voice"| EL
  screen -->|"summary if voice"| EL

  %% Lab report photo: one Gemini call, no agent, no MCP
  docs --> Files
  docs -->|"vision extraction"| Gemini
  docs -->|"insert suggestions"| Tiger

  %% Approval: the only path that writes to the chart
  sugg --> Tiger
  sugg --> D3box
  D3box --> D3
  D3q -->|"yes: embed, store in Tiger"| Gemini

  %% Reminders + SMS
  rem --> Tiger
  runrem --> Tiger
  runrem --> D4box
  D4box --> D4
  D4q -->|"yes"| Twilio
  Twilio -->|"SMS, no health details"| Pt
  Pt -->|"replies"| Twilio
  Twilio --> twhook
  twhook --> Tiger

  %% Insurance stretch
  elig --> Tiger
  elig --> Stedi
  elig --> D5box
  D5box --> D5
  D5q -->|"yes - REST: search payer policy PDFs"| Snow
  elig -.->|"plain-English summary"| Gemini
```

## When MCP is used

| Caller | MCP server | Tools | Reaches |
|---|---|---|---|
| Chart-update agent | EMR MCP (ours) | `get_patient_context`, `propose_change` | Tiger Data |
| Research agent | EMR MCP (ours) | `get_patient_context`, `search_patient_notes` | Tiger Data |
| Screening agent | EMR MCP (ours) | `get_patient_context`, `propose_change` | Tiger Data |

## When Snowflake REST is used

| Caller | How | Searches |
|---|---|---|
| Research agent | `search_guidelines` function tool, Cortex Search REST via `httpx` | USPSTF guidelines, PubMed abstracts |
| Screening agent | `search_guidelines` function tool, Cortex Search REST via `httpx` | USPSTF guidelines |
| Eligibility endpoint (stretch) | Cortex Search REST via `httpx` | Payer policy PDFs |

Snowflake only ever receives de-identified clinical descriptions, never patient records or identifiers.

The plain endpoints never use MCP: body view, photo upload, approvals, reminders, SMS and webhooks call the database or vendor API directly.

`propose_change` can only insert into `ai_suggestions`. The only thing that writes to the chart is `POST /suggestions/approve`, after the doctor clicks it.
