/* -----------------------------------------------------------
 *  Finley SMS ↔ Assistants API  (per-phone thread memory)
 * ----------------------------------------------------------- */
import express from "express";
import twilio  from "twilio";
import OpenAI  from "openai";

/* ---------- OpenAI ---------- */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID;

/* ---------- Simple in-memory thread store (replace w/ Redis later) ---------- */
const threads = new Map();   // key = phone number, value = threadId

/* ---------- Express ---------- */
const app = express();
app.use(express.urlencoded({ extended: false }));   // parse form-encoded SMS bodies

app.post("/sms", async (req, res) => {
  const incoming = (req.body.Body || "").trim();
  const phone    = req.body.From;                         // “+15555551234”

  /* 1 ▸ look up or create a thread for this phone */
  let threadId = threads.get(phone);
  if (!threadId) {
    const thread = await openai.beta.threads.create();
    threadId = thread.id;
    threads.set(phone, threadId);
  }

  /* 2 ▸ add the user message to the thread */
  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: incoming
  });

  /* 3 ▸ run the assistant & wait for completion */
  let gptReply = "Sorry, something went wrong 😬";
  try {
    const run = await openai.beta.threads.runs.createAndWait(threadId, {
      assistant_id: ASSISTANT_ID
    });

    gptReply = run.output.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI error →", err.message);
  }

  /* 4 ▸ respond via Twilio */
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(gptReply);
  res.type("xml").send(twiml.toString());
});

/* ---------- Listen ---------- */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Finley SMS (Assistants) running on ${PORT}`));
