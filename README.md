# n8n-nodes-tinysend

n8n community node for [tinysend](https://tinysend.com) — send newsletters and transactional email, manage subscribers and agent mailboxes, and trigger workflows on inbound email.

This is the only email node for n8n that can receive: a **tinysend Trigger** can start a workflow on an inbound email arriving in a real mailbox, not just on send events.

## Install

n8n → Settings → Community Nodes → Install → `n8n-nodes-tinysend`.

Self-hosted n8n can install any community node. On n8n Cloud, install once this node is verified.

## Credentials

Create an API key at [id.tinysend.com](https://id.tinysend.com) (starts with `sk_`) and paste it into the tinysend API credential.

## Nodes

tinysend (actions):
- Newsletter — Send (create a post + broadcast to a list) · Create Draft
- Subscriber — Add · Get Many
- Transactional Email — Send (one-off to a single recipient)
- Mailbox — Create (agent inbox / disposable) · Send Email (reply from a mailbox) · Get Many

tinysend Trigger (starts a workflow on an event):
- New Subscriber · Subscriber Unsubscribed
- Post Sent · Post Delivered
- Inbound Email Received · Email Delivered / Opened / Clicked / Bounced / Replied

## Links

- API + docs: https://tinysend.com/developers
- MCP server: https://mcp.tinysend.com

MIT © System Operator LLC
