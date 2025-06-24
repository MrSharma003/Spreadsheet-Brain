import express from "express";
import { updateCellFromWebhook } from "../modules/update";

const router = express.Router();

router.post("/update", async (req, res) => {
  try {
    const { address, value, sheet, formula } = req.body;
    console.log(address, value, sheet, formula);

    if (!address || !sheet) {
      return res.status(400).json({ error: "Missing address or sheet" });
    }

    await updateCellFromWebhook({ address, value, sheet, formula });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

export default router;
