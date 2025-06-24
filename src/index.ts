import express from "express";
import sheetWebhook from "./routes/sheetWebhook";
import dotenv from "dotenv";
import { ingestSpreadsheet } from "./modules/ingest";
import { askQuestion } from "./modules/ask";
import { initNeo4j } from "./modules/neo4j";
import { initGemini } from "./modules/gemini";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

initNeo4j();
initGemini();

app.use("/sheets", sheetWebhook);

app.post("/ingest", async (req, res) => {
  const { spreadsheetId } = req.body;
  console.log(req.body);
  if (!spreadsheetId) {
    return res
      .status(400)
      .json({ error: "Missing spreadsheetId in request body" });
  }
  try {
    await ingestSpreadsheet(spreadsheetId);
    res.status(200).json({ message: "Ingestion complete" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to ingest spreadsheet" });
  }
});


app.post("/ask", async (req, res) => {
  const { question } = req.body;
  try {
    const result = await askQuestion(question);
    res.status(200).json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to process question" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
