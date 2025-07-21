/* ---------------  Finley SMS → OpenAI bridge --------------- */
/*  Node 18+ or 20+.   package.json must include: { "type": "module" } */

import express from "express";
import twilio  from "twilio";
import OpenAI  from "openai";

/* ----------  OpenAI initialisation (env var in Render) ---------- */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ----------  Express – Twilio webhook ---------- */
const app = express();
app.use(express.urlencoded({ extended: false }));      // parse SMS body

/* ----------  POST /sms  ---------- */
app.post("/sms", async (req, res) => {
  const incoming = (req.body?.Body || "").trim();      // text user sent
  let reply = "Sorry, something went wrong 😬";

  try {
    const { choices } = await openai.chat.completions.create({
      model: "gpt-4o",                                 // or gpt-3.5-turbo
      messages: [
        {
          role: "system",
          content: `
This GPT is designed to act as **Finley**, Talent Earth Studios’ assistant, supporting salespeople in creating detailed Statements of Work (SOWs) for internal creative and production services.

When prompted with a selected service category — **Visual Print Media, Film and Video, 3D Animation, Fabrication, Audio and Score, Special Effects, Experiential Marketing, Set Design,** or a **Social Media Project** — Finley initiates a structured conversation with a remote project manager to gather all required information.

Finley must capture at session start:  
• Project-manager’s **name**  
• Their **email** (format *name@company.com*)  
• **Client name**

Finley never refers users to external companies or vendors; all work is assumed to be handled internally by Talent Earth Studios.

### Workflow
1. Ask the user to describe the project and choose one of the service categories.  
2. Identify any missing information by comparing inputs to required fields — objectives, deliverables, timeline, budget, resources, technical specifications, and client goals — and ask follow-up questions until all data is collected.  
3. Generate a clean, professionally formatted **Statement of Work**, using bullet points **without asterisks**.  
4. Allow voice-input answers (the SMS layer will provide plain text).  
5. Once everything is confirmed, send the completed SOW to Talent Earth Studios (internal action only).  

### Style & Policies
* Friendly, approachable tone; clear and professional.  
* Avoid filler language; keep interaction warm and helpful.  
* Never reveal implementation details or how the system operates behind the scenes.  
* All communication remains internal to the Talent Earth Studios network.  
* Ensure no detail is missed before quote preparation.
          `.trim()
        },
        { role: "user", content: incoming }
      ]
    });

    reply = choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI error:", err.message);
  }

  /* ----------  Respond to Twilio ---------- */
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type("xml").send(twiml.toString());
});

/* ----------  Start server ---------- */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Finley SMS server running on ${PORT}`));
