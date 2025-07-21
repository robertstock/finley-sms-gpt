import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import { Configuration, OpenAIApi } from "openai";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

/* OpenAI v3 */
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

app.post("/sms", async (req, res) => {
  const incoming = (req.body.Body || "").trim();
  let reply = "Sorry, something went wrong 😞";

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are Finley, a friendly project-scope assistant at TalentEarthStudios." },
        { role: "user", content: incoming }
      ],
    });
    reply = completion.data.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenAI error:", err.message);
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type("text/xml").send(twiml.toString());
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Finley SMS server running on ${PORT}`));
