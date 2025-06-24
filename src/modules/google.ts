import { google } from "googleapis";

export async function getSheet(spreadsheetId: string) {
  const isPublicSheet = true; 

  const sheets = google.sheets({
    version: "v4",
    auth: process.env.GOOGLE_API_KEY, 
  });

  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: true,
  });

  return res.data;
}
