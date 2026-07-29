# Real notifications — the setup, once

The code is all written. Four steps remain, and they only need doing one time.

Until step 4, the in-app **Alerts** drawer already works. These steps add the
part that reaches your phone **when the app is closed**.

---

## 1 · Install Node (so you can generate keys)

Push messages are signed with a VAPID keypair that must be generated on your
machine — never by a website, which would mean handing your private key to a
stranger.

```powershell
winget install OpenJS.NodeJS.LTS
```

Close and reopen your terminal, then:

```powershell
npx web-push generate-vapid-keys
```

It prints two long strings. Keep the window open.

---

## 2 · Create the Supabase table

Supabase → **SQL Editor** → **New query** → paste the contents of
`supabase-push.sql` → **Run**.

That makes one table holding which devices agreed to be notified.

---

## 3 · Add six environment variables in Vercel

**Settings → Environment Variables.** Tick all three environments for each.

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | the Public Key from step 1 |
| `VAPID_PRIVATE_KEY` | the Private Key from step 1 |
| `VAPID_SUBJECT` | `mailto:` and your email |
| `SUPABASE_URL` | `https://gkqiivndqvjrwozbxgqk.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → **service_role** key |
| `CRON_SECRET` | any long random string you invent |

> **`service_role` is a master key** — it bypasses every security rule. It
> belongs only in Vercel, never in a file, never in the browser, never in chat.

Then **Deployments → ⋯ → Redeploy**.

---

## 4 · Turn it on

**On your phone (iPhone):** open the site in Safari → **Share → Add to Home
Screen** → open the app *from the home screen icon*. Apple only permits
notifications from an installed app — in a normal Safari tab it will never
fire.

**On Android / desktop:** works straight from the browser.

Then: **Alerts** (sidebar) → **Turn on phone alerts** → allow.

---

## Testing it

Visit this once, in a browser:

```
https://YOUR-SITE.vercel.app/api/push-send?test=1&secret=YOUR_CRON_SECRET
```

You should get a notification, and the page returns `{"sent":1,...}`.
`{"sent":0}` means no device has subscribed yet.

---

## What runs automatically

`vercel.json` schedules `/api/push-send` daily at **13:00 UTC**. Change the
`schedule` line to move it — it is standard cron (`minute hour day month
weekday`).

**Limit worth knowing:** Vercel's free Hobby plan runs cron **once per day**.
Several fixed times a day needs the Pro plan. Per-goal reminders at arbitrary
times would need a scheduling table plus a more frequent cron — a later job,
and easy once this pipe exists.
