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
    name: 'log_food',
    description: 'Record something they ate or drank. Call this whenever they mention consuming something ("two eggs and toast", "had a protein shake"). Fill in the macros yourself from ordinary nutrition knowledge — they can correct any figure in the Nutrition tab, so a sensible estimate is far more useful than refusing.',
    input_schema: {
      type: 'object',
      properties: {
        meal: { type: 'string', enum: ['breakfast','lunch','dinner','snacks'], description: 'Omit to use the meal that fits the current time.' },
        items: {
          type: 'array',
          description: 'One entry per distinct food.',
          items: {
            type: 'object',
            properties: {
              name:    { type: 'string', description: 'Include the amount, e.g. "2 eggs", "200g chicken breast".' },
              cal:     { type: 'number' },
              protein: { type: 'number', description: 'grams' },
              carbs:   { type: 'number', description: 'grams' },
              fats:    { type: 'number', description: 'grams' },
            },
            required: ['name', 'cal', 'protein', 'carbs', 'fats'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'complete_task',
    description: 'Tick off something already on a day\'s list. Call this when they say they finished or did something ("done with the gym", "I called mum"). Match against the open tasks you were given.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Enough of the task text to identify it.' },
        date: { type: 'string', description: 'YYYY-MM-DD. Today if unstated.' },
      },
      required: ['text'],
    },
  },
  {
    name: 'complete_goal',
    description: 'Mark a goal finished. Call this only when they clearly say they achieved it.',
    input_schema: {
      type: 'object',
      properties: { title: { type: 'string', description: 'Enough of the goal title to identify it.' } },
      required: ['title'],
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

const SYSTEM = `You are Nova, the assistant inside one person's personal life-tracking app. You are talking to the person who owns it. You know them — their board is given to you below, rebuilt fresh every time they speak.

Do one of two things with every message:

1. If they are telling you to record, complete, or open something, call the matching tool. One tool call, then stop — do not also write a paragraph explaining what you did; the app confirms it visually.
2. Otherwise answer them, using their board as the first source. Search the web only when the answer genuinely depends on something outside their data — prices, news, results, whether something is still true.

ABOUT THEIR BOARD. Read it before answering anything about them. It holds their open goals and how far along each is, what is on today's list, this week's sleep/water/steps against their own targets, today's food against their calorie target, their weight trend, their reminders, and their app ideas. Answer from it directly and specifically — name the actual goal, quote the actual number.

Notice things. If they ask what is left today and their water is far under target, or a goal is overdue, or they slept five hours and are asking about training — say so in one clause. Do not deliver a list of observations they did not ask for; one relevant noticing, at most, attached to the answer.

If something genuinely is not in the board, say which tab would hold it once they log it. Do not guess at a number that is not there, and never present an estimate as their data.

STYLE. Two or three sentences. This is read on a phone, in a small panel, often mid-task. Lead with the answer, then the one piece of context that earns its place. No preamble, no bullet lists, no restating their question, no "great question". Talk like someone who knows them and respects their time.

Never invent a number.`;

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

  /* Prior turns, so a follow-up ("what about tomorrow?") resolves. Only the
     exchange is carried — the board is rebuilt every turn, so an old copy
     could otherwise contradict the current one. */
  const prior = Array.isArray(req.body && req.body.history) ? req.body.history : [];
  const history = prior
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-16)
    .map(m => ({ role: m.role, content: m.content.slice(0, 600) }));

  /* A conversation must begin with a user turn and alternate; a truncated
     window can start on an assistant reply, which the API rejects. */
  while (history.length && history[0].role !== 'user') history.shift();

  let messages = [...history, { role: 'user', content: utterance }];
  /* filled in below, after boardBlock is built */

  const board = (req.body && req.body.board) || null;

  /* ── WHY THE BOARD IS A MESSAGE, NOT PART OF `system` ──────────────────────
     Caching is a prefix match: the cache key is the exact bytes up to the
     breakpoint. The board changes every single turn, so putting it in `system`
     (which renders before messages) would change the prefix every time and
     nothing would ever cache — paying full price for the ~2,000 tokens of
     instructions and tool definitions on every question.

     A `role: "system"` message sits AFTER the cached prefix instead. It still
     carries operator authority — it is not something the person said, so it
     cannot be mistaken for their words on a later turn — while the stable
     instructions in front of it are read from cache at a tenth of the price.

     It must follow a user turn and be either last or followed by an assistant
     turn; appended after the utterance, it satisfies both. */
  const boardBlock = board
    ? `Today is ${today}. Local time: ${nowLocal} (${tz}).\n\nTHEIR BOARD RIGHT NOW (regenerated this turn — trust it over anything earlier in the conversation):\n${JSON.stringify(board, null, 1).slice(0, 14000)}`
    : `Today is ${today}. Local time: ${nowLocal} (${tz}).\n\nTheir board did not load this turn — say so rather than guessing at their numbers.`;

  messages.push({ role: 'system', content: boardBlock });

  try {
    let response;
    /* A web search runs a server-side loop that can hit its iteration limit and
       come back as pause_turn. Resuming is just re-sending with the assistant
       turn appended — capped so a pathological case cannot bill forever. */
    for (let i = 0; i < 4; i++) {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 2048,
        /* The breakpoint goes on the last system block. Render order is
           tools → system → messages, so this one marker caches BOTH the tool
           definitions and the instructions — the ~2,000 tokens that are
           byte-identical on every question. Cache reads cost a tenth. */
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools,
        messages,
        /* Thinking is billed as output at $25/M, and effort is the dial on how
           much of it happens. Answering from a board that was handed over, or
           picking one tool, is a scoped task — `low` handles it well on this
           model and is the single biggest saving available. Raise it with
           NOVA_EFFORT if answers ever feel shallow. */
        output_config: { effort: process.env.NOVA_EFFORT || 'low' },
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

    /* Returned so the browser can surface real spend rather than an estimate.
       A healthy second-or-later question shows most input arriving as
       cache_read — if that stays zero, the prefix is being invalidated. */
    const u = response.usage || {};
    return res.status(200).json({
      kind: 'text',
      text: said || 'I could not find an answer to that.',
      searched,
      usage: {
        in: u.input_tokens || 0,
        out: u.output_tokens || 0,
        cacheRead: u.cache_read_input_tokens || 0,
        cacheWrite: u.cache_creation_input_tokens || 0,
      },
    });
  } catch (e) {
    const status = e && e.status;
    if (status === 401) return res.status(200).json({ error: 'bad_key' });
    if (status === 429) return res.status(200).json({ error: 'rate_limited' });
    return res.status(200).json({ error: 'failed', detail: String((e && e.message) || e).slice(0, 200) });
  }
}
