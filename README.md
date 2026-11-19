# Incident Triage Workspace

Turn a synthetic incident log into a UTC timeline with a link back to the original source line for every event.

**[Open the live Vercel demo](https://incident-triage-workspace.vercel.app/)**

1. Select **Run live demo**. The public demo requires no visitor API key.
2. Check the five events in UTC order. The source lines appear in the order **1 → 3 → 2 → 4 → 5**.
3. Select **Line 3** to highlight the database connection-pool warning in the original log.

**Build timeline** runs the browser demo and accepts pasted test logs in the format `ISO-8601 timestamp LEVEL service message`.

## How it works

The [manifest](https://incident-triage-workspace.vercel.app/agent-manifest.json) and [network definition](https://incident-triage-workspace.vercel.app/incident_triage.network.json) describe a browser agent built for the Cognizant Open Agentic Web Challenge. The browser runs the agent through nsDeploy. Its read-only site action invokes a deterministic parser that sorts timestamps and retains the original line numbers. The live route uses Groq GPT-OSS 20B with the fixed synthetic scenario. The provider key stays in the Vercel function.

## Run the browser demo locally

From the repository root, serve the files over HTTP:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080) and choose **Build timeline**. The live button is for the Vercel deployment, where the server route and production secret are available.

## Upstream runtime

The vendored browser runtime in [`runtime/`](runtime/) comes from the [Cognizant agentic-web contest-start snapshot](https://github.com/cognizant-ai-labs/agentic-web/tree/e4a8727d5c6807233b8976f28494bbdac7bc1c6e/examples/pizza_restaurant_agentified/runtime). See [its Apache 2.0 license](runtime/LICENSE.txt).
