# Authenticate and send your first request to the Claude API in Node.js

Most "getting started" guides for LLM APIs skip the two things that actually trip people up: how error handling really behaves, and what the SDK does for you versus what you still have to write yourself. This walks through both, using Anthropic's official Node.js SDK for Claude — installed, run, and error-tested while writing this, not copied from memory.

## What you'll build

A small script that authenticates with the Claude API, sends a single prompt, and prints the response — plus a version with proper error handling, since that's the part most quickstarts leave out.

## Prerequisites

- Node.js 18 or later
- An Anthropic account and API key from the [Anthropic Console](https://console.anthropic.com)
- A few dollars of API credit (the free trial credit works fine for this)

## Step 1: Install the SDK

```bash
mkdir claude-quickstart && cd claude-quickstart
npm init -y
npm install @anthropic-ai/sdk
```

This installs the official SDK (version 0.116.0 at the time of writing — Anthropic ships frequent updates, so don't be surprised if your version number is a little different).

## Step 2: Set your API key

The SDK looks for an `ANTHROPIC_API_KEY` environment variable automatically — you don't need to pass it in code. Set it in your shell:

```bash
export ANTHROPIC_API_KEY="your-key-here"
```

For anything beyond a quick local test, use a `.env` file with a package like `dotenv` instead of exporting it in your shell, and make sure `.env` is in `.gitignore`. An API key committed to a public repo will get scraped and abused within hours — this isn't hypothetical, it happens routinely.

## Step 3: Write the request

```javascript
import Anthropic from "@anthropic-ai/sdk";

// The client reads ANTHROPIC_API_KEY from your environment automatically.
const client = new Anthropic();

async function main() {
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "Explain what an API is in one paragraph, for a non-technical reader.",
      },
    ],
  });

  console.log(message.content[0].text);
}

main();
```

Save this as `quickstart.mjs` (the `.mjs` extension, or `"type": "module"` in your `package.json`, is what lets you use `import` instead of `require`).

A couple of details worth understanding rather than just copying:

- **`max_tokens` is required**, and it caps the length of Claude's response, not your prompt. Set it comfortably above what you expect the answer needs — if the response gets cut off mid-sentence, this is usually why.
- **`model` names are versioned strings** (`claude-sonnet-5` here). Anthropic updates model names as new versions ship, so if a tutorial's model string stops working, check the current model list in the docs rather than assuming your code is broken.
- **`message.content` is an array**, not a string. For a simple text response, `message.content[0].text` gets you the string — but a response can contain multiple content blocks (for example, if Claude uses a tool), so don't assume index `0` is always what you want once you move past single-turn text prompts.

## Step 4: Run it

```bash
node quickstart.mjs
```

You should see Claude's answer printed to your terminal.

## Step 5: Handle errors properly

This is the part almost every quickstart skips, and it's the part that actually matters once this code is running somewhere other than your laptop. I tested this directly by calling the API with a deliberately invalid key, so the error shape below is what the SDK actually returns, not a guess:

```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function safeCall(prompt) {
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    return message.content[0].text;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`API error ${error.status}: ${error.message}`);
      if (error.status === 401) {
        console.error("Check that ANTHROPIC_API_KEY is set correctly.");
      }
      if (error.status === 429) {
        console.error("Rate limit hit — back off and retry.");
      }
    } else {
      throw error; // something unexpected — don't swallow it
    }
  }
}
```

With an invalid key, this is the actual error the SDK throws:

```
Error name: AuthenticationError
Status: 401
Message: 401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"},"request_id":"req_..."}
```

Two things worth noting from that output: the SDK gives you a typed error class (`AuthenticationError`, a subclass of `Anthropic.APIError`) rather than a generic exception, so you can branch on `error.status` cleanly instead of parsing message strings. And every error response includes a `request_id` — save that in your logs, because if you ever need to raise an issue with Anthropic's support, that ID is what lets them find the exact request server-side.

## Where this goes from here

The pattern above — instantiate a client, call `messages.create`, handle the typed errors — is the foundation everything else builds on: streaming responses for real-time output, multi-turn conversations (which means maintaining a `messages` array yourself and appending both sides of the exchange, since the API is stateless between calls), and tool use, where Claude can call functions you define. All of them use this same request shape with a few more fields added.

If you're building anything that calls this API from a script that runs unattended — a cron job, a CI pipeline, a background worker — the error-handling version above, not the bare version, is the one to actually ship. The bare version is for learning the shape of the API; production code needs to assume the network call will eventually fail and behave sensibly when it does.
