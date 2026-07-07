# ADR-0008: AI Gateway Architecture

## Status
Approved (Frozen in BOS Architecture v1.0.0)

## Context
As the COSMY platform expands, integrating AI logic directly into business capabilities (e.g., Sales querying an LLM to summarize an order) introduces severe security, context-bleeding, and maintenance risks. AI requires specialized orchestration, memory management, and explicit policy enforcement to prevent hallucinations and unauthorized access.

## Decision
We will establish an isolated **AI Gateway Subsystem** (`packages/ai-gateway`) that acts as the sole orchestrator for all AI interactions across the ERP.

The AI Gateway will consist of the following decoupled modules:
1. **Model Router**: Abstracting LLM providers (OpenAI, Anthropic, local models) enabling hot-swapping based on task complexity.
2. **Capability Registry**: Mapping what each business capability (Sales, Finance) allows the AI to see or do.
3. **Prompt Registry**: Centralized repository of versioned, tested system prompts.
4. **Tool Registry**: Whitelisted RPC functions the AI can execute.
5. **MCP Manager**: Model Context Protocol integration for connecting external data sources.
6. **Memory Manager**: Vector database integration for long-term user and entity memory.
7. **Conversation Store**: Auditable history of all user-AI interactions.
8. **Policy Engine**: Security enforcement preventing the AI from generating commands the user lacks permissions for.
9. **Approval Engine**: Forcing human-in-the-loop validation for any mutating AI action.
10. **Context Builder**: Hydrating prompts dynamically with the strict `ContextualIrisMetadata` object.
11. **Semantic Search / Knowledge Index**: RAG capabilities over ERP documentation and historical data.
12. **Reasoning Pipeline**: Multi-agent orchestration for complex tasks.
13. **Audit Logger**: Cryptographic logging of AI decisions.

## Execution Modes (Middleware Pipeline)
To ensure AI mutations never bypass business rules, the Gateway enforces a mandatory 7-stage pipeline. Each stage is implemented as an **independent middleware component**, allowing the platform to easily add or replace capabilities (e.g., introducing a compliance checker) without redesigning the core pipeline:
1. **Read**: Safe data extraction using standard queries.
2. **Explain**: AI reasoning transparency, explaining *why* it intends to take action.
3. **Simulate**: Dry-run of proposed mutations without committing.
4. **Risk Assessment**: The Policy Engine scores the simulated mutations for business/security risk.
5. **Approval**: High-risk actions are routed to the Workflow Engine for human-in-the-loop validation.
6. **Execute**: Final authorized mutation using standard Commands.
7. **Audit**: Cryptographic logging of the complete interaction.

## Consequences
- Business Capabilities no longer depend on LangChain, OpenAI SDKs, or vector databases.
- The UI strictly sends `AskIris(context, query)` to the gateway.
- AI hallucination risk drops significantly because context is strictly bounded by the `Policy Engine` and `Context Builder`.
