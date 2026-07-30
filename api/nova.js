/* ============================================================================
   /api/nova — Nova's brain, and the only place a model key exists.

   WHY THIS IS A SERVER ENDPOINT: an API key in a static page is a public key.
   Anyone can read it out of the JavaScript and spend your money. So the key
   lives in Vercel's environment, this function holds it, and the browser only
   ever talks to this URL.

   HOW IT DIVIDES THE WORK: the browser tries its own pattern matching FIRST
   (instant, free, offline). Only what it cannot parse arrives here. So the
   common commands never cost anything, and this handles the rest:

     · real questions, answered from the live web with citations
     · commands phrased in a way no pattern would catch
     · anything needing judgement rather than matching

   HOW IT ANSWERS: Claude is given your app's actions as tools plus a web
   search tool. It either calls an action — which comes back for the browser to
   perform through the same save-and-render path a typed entry uses — or it
   answers in text, searching the web first when the answer depends on
   something current.

   REQUIRED ENV (Vercel → Settings → Environment Variables):
     ANTHROPIC_API_KEY
   ========================================================================== */

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5';

/* The app's own verbs, described so Claude knows WHEN to reach for each — a
   description that only says what a tool does gets called less often. */
const ACTIONS = [
  {
    name: 'add_goal',
    description: 'Save a long-term goal. Call this when the person states something they want to achieve over weeks or months ("I want to squat 315", "learn guitar").',
    input_schema: {
      type: 'object',
      properties: {
        title:    { type: 'string', description: 'The goal, phrased as a short outcome.' },
        deadline: { type: 'string', description: 'YYYY-MM-DD if they named or implied a date. Omit if not.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'add_task',
    description: 'Put something on a specific day\'s list. Call this for anything they intend to do on a particular day, with or without a time.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The task, short.' },
        date: { type: 'string', description: 'YYYY-MM-DD. Use today if unstated.' },
        time: { type: 'string', description: 'HH:MM 24-hour, if they gave one.' },
      },
      required: ['text', 'date'],
    },
  },
  {
    name: 'add_reminder',
    description: 'Set a reminder that fires at a moment. Call this when they say "remind me" or want to be told at a time.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        when: { type: 'string', description: 'Full ISO 8601 timestamp.' },
      },
      required: ['text', 'when'],
    },
  },
  {
    name: 'add_idea',
    description: 'Save an idea for improving this app itself. Call this for feature or tab ideas, not for life goals.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        kind: { type: 'string', enum: ['tab', 'feature', 'upgrade', 'design', 'fix'] },
      },
      required: ['text'],
    },
  },
  {
    name: 'navigate',
    description: 'Open one of the app\'s tabs. Call this when they just want to go somewhere.',
    input_schema: {
      type: 'object',
      properties: {
        tab: {
          type: 'string',
          enum: ['home','gym','supplements','subscriptions','vitals','peak','map','stocks',
                 'goals','reminders','nutrition','finance','photos','academics','logs',
                 'clothes','sports','calendar','stats'],
        },
      },
      required: ['tab'],
    },
  },
];

const SYSTEM = `You are Nova, the assistant inside one person's personal life-tracking app. You are talking to the person who owns it.

Do one of two things with every message:

1. If they are telling you to record or open something, call the matching tool. One tool call, then stop — do not also write a paragraph explaining what you did; the app confirms it visually.
2. If they are asking you something, answer it. Search the web first whenever the answer depends on anything current — prices, news, sports results, dates, whether something is still true. Do not answer from memory when the answer could have changed.

Answer in two or three sentences. This is read on a phone, in a small panel, often mid-task. Lead with the answer itself, then the one piece of context that matters. No preamble, no bullet lists, no restating their question.

When they ask about their own body, training, food, or money, remember you cannot see their data — the app holds it and you do not. Say so plainly in a few words rather than guessing, and tell them which tab has it.

Never invent a number. If a search did not find it, say you could not find it.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'post_only' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(200).json({ error: 'no_key' });

  const text = String((req.body && req.body.text) || '').trim();
  if (!text) return res.status(400).json({ error: 'no_text' });
  /* a spoken command is a sentence, not a document — anything longer is a
     mistake or someone probing, and truncating costs nothing real */
  const utterance = text.slice(0, 2000);

  /* Today, in THEIR timezone, so "tomorrow" resolves to the day they mean
     rather than the day the server is having. */
  const tz = 'America/New_York';
  let today, nowLocal;
  try {
    today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    nowLocal = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date());
  } catch (e) {
    today = new Date().toISOString().slice(0, 10);
    nowLocal = '';
  }

  const client = new Anthropic({ apiKey: key });

  const tools = [
    ...ACTIONS,
    /* dynamic filtering built in on Opus 5 — do NOT also declare code
       execution, a second sandbox only confuses the model */
    { type: 'web_search_20260209', name: 'web_search', max_uses: 4 },
  ];

  let messages = [{ role: 'user', content: utterance }];

  try {
    let response;
    /* A web search runs a server-side loop that can hit its iteration limit and
       come back as pause_turn. Resuming is just re-sending with the assistant
       turn appended — capped so a pathological case cannot bill forever. */
    for (let i = 0; i < 4; i++) {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: `${SYSTEM}\n\nToday is ${today}. Local time: ${nowLocal} (${tz}).`,
        tools,
        messages,
        /* Opus 5's classifiers can decline a request; "default" re-runs it on
           Anthropic's recommended fallback rather than handing back a refusal */
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });

      if (response.stop_reason !== 'pause_turn') break;
      messages = [...messages, { role: 'assistant', content: response.content }];
    }

    /* A refusal is a normal 200 with an empty or partial content array — check
       it before indexing, or this throws on the happy path's own shape. */
    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ kind: 'text', text: 'I can’t help with that one.' });
    }

    /* An app action: hand it back for the browser to perform, so it goes
       through the same save-and-render path a typed entry uses. */
    const call = response.content.find(
      b => b.type === 'tool_use' && ACTIONS.some(a => a.name === b.name)
    );
    if (call) {
      return res.status(200).json({ kind: 'action', action: call.name, input: call.input });
    }

    const said = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join(' ')
      .trim();

    const searched = response.content.some(b => b.type === 'web_search_tool_result');

    return res.status(200).json({
      kind: 'text',
      text: said || 'I could not find an answer to that.',
      searched,
    });
  } catch (e) {
    const status = e && e.status;
    if (status === 401) return res.status(200).json({ error: 'bad_key' });
    if (status === 429) return res.status(200).json({ error: 'rate_limited' });
    return res.status(200).json({ error: 'failed', detail: String((e && e.message) || e).slice(0, 200) });
  }
}
