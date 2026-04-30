# Claude N8N Project

## Project Purpose
This project exists to build n8n automation workflows. The user describes what they want; Claude uses the n8n MCP server and n8n skills to design, validate, and deploy workflows directly to the local n8n instance. Every workflow should be production-quality: well-named, error-handled, and tested before being marked done.

---

## n8n Environment
- **Instance**: Local Docker (n8n v1.95.2)
- **URL**: `http://localhost:5678`
- **MCP config**: `N8N_API_URL=http://localhost:5678`, `N8N_API_KEY=<set in MCP server settings>`

---

## n8n MCP Server (czlonkowski/n8n-mcp)

### Core tools — always available
| Tool | Use for |
|---|---|
| `tools_documentation` | Reference all MCP capabilities |
| `search_nodes` | Full-text search across 1,500+ n8n nodes |
| `get_node` | Node details — use mode `full` for unfamiliar nodes |
| `validate_node` | Check a single node configuration |
| `validate_workflow` | Full workflow validation (connections, AI agents) |
| `search_templates` | Find community workflows by keyword or node |
| `get_template` | Get complete JSON of a community template |

### Management tools — require N8N_API_URL + N8N_API_KEY
- **Workflow**: create, get, update (full/partial), delete, list, autofix, version history, deploy templates
- **Execution**: test, list, retrieve, delete executions
- **Credentials**: list, create, update, delete, getSchema
- **System**: health checks, security audits

### Usage rules
- Always run `validate_workflow` before `create` or `update`
- Always `search_nodes` to confirm the exact node type string before using it — never guess
- Run `get_node` with `full` mode on any unfamiliar node before configuring it
- Use `search_templates` + `get_template` to study proven patterns before building from scratch

---

## n8n Skills (czlonkowski/n8n-skills)
Seven skills that activate automatically based on query content:

| Skill | Covers |
|---|---|
| **n8n MCP Tools Expert** | Tool selection strategy, node type formats, validation profiles — consult first |
| **n8n Workflow Patterns** | 5 proven architectures: webhook, HTTP API, database, AI, scheduled |
| **n8n Expression Syntax** | `{{}}` syntax, `$json`, `$node`, `$items`, common mistakes |
| **n8n Node Configuration** | Operation-aware property dependencies, AI connection types |
| **n8n Validation Expert** | Interpreting validation errors, false positives, troubleshooting |
| **n8n Code JavaScript** | Data access patterns, return formats, top error patterns (62%+ of failures) |
| **n8n Code Python** | Python nodes, no-external-libraries constraint, stdlib alternatives |

---

## Workflow Quality Standards
- **Names**: every workflow and every node gets a descriptive name — never leave defaults ("Set", "IF", "Merge", "Code")
- **Error handling**: all external service calls need an error branch; use the Error Trigger node for global catches
- **Credentials**: always use n8n credential references — never hardcode secrets in Code nodes
- **Expressions**: use `{{}}` syntax; validate with `$json` access patterns from the Expression Syntax skill
- **Modularity**: extract reusable logic into sub-workflows
- **Sticky Notes**: add Sticky Note nodes to explain non-obvious branching or configuration decisions
- **Testing**: `validate_workflow` → fix all errors → test execution → inspect each node's output

---

## Standard Build Process
1. Understand the user's goal fully before starting
2. `search_templates` for similar existing workflows to use as reference
3. Design node structure using the n8n Workflow Patterns skill
4. `search_nodes` / `get_node` to confirm exact node types and required properties
5. Build the workflow JSON
6. `validate_workflow` — fix all reported errors
7. `create` (or `update`) via MCP management tools
8. Trigger a test execution and confirm output at each node

---

## Reference Workflows
Existing workflows in `/Users/alexm/N8N/N8N workflows/` — use as patterns:
- **RAG chatbot** (`AI_FAQ_Assistant_with_RAG_Pipeline.json`): Chat Trigger → LangChain Agent → Pinecone vector store + Google Drive document loader
- **AI Agent with tools** (`JARVIS.json`): Webhook → LangChain Agent + Calculator/HTTP/sub-workflow tools + memory buffer
- **Feedback pipeline** (`AI_feedback_analyzer_final.json`): Manual Trigger → OpenAI → Code transform → Google Sheets
- **Invoice processor** (`Invoice_Processing_Octra.json`): Gmail trigger → PDF extract → LLM info extractor → Google Drive output
