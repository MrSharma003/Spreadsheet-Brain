# Spreadsheet Brain

## Overview
Spreadsheet Brain is a backend application designed to ingest data from Google Sheets and store it in a Neo4j knowledge graph. It supports real-time updates using Google Sheets API and Ngrok for webhook integration. The application processes spreadsheet data, identifies headers and blocks, and creates relationships between tables, rows, columns, cells, formulas, and constants in the graph database.

---

## Features
- **Google Sheets Integration**: Fetch data from Google Sheets using the spreadsheet ID.
- **Neo4j Knowledge Graph**: Store spreadsheet data as nodes and relationships in a graph database.
- **Real-Time Updates**: Use Ngrok to expose a local server for webhook integration with Google Sheets.
- **Formula and Value Handling**: Capture both formulas and computed values for cells, along with their dependencies.

---

## Installation

### Prerequisites
- Node.js (v16 or higher)
- Neo4j database
- Ngrok (for webhook integration)

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/MrSharma003/spreadsheet-brain.git
   cd spreadsheet-brain
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:
   ```env
   GOOGLE_API_KEY=your_google_api_key
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your_password
   NGROK_AUTH_TOKEN=your_ngrok_auth_token
   ```

4. Start Ngrok to expose the local server:
   ```bash
   ngrok http 3000
   ```
   Copy the generated Ngrok URL and use it to configure the webhook in Google Sheets.

5. Run the backend server:
   ```bash
   npm start
   ```

---

## API Endpoints

### 1. **Ingest Spreadsheet**
   - **Endpoint**: `POST /api/ingest`
   - **Description**: Ingests data from a Google Sheet and stores it in the Neo4j knowledge graph.
   - **Request Body**:
     ```json
     {
       "spreadsheetId": "your_spreadsheet_id"
     }
     ```
   - **Response**:
     ```json
     {
       "status": "success",
       "message": "Spreadsheet data ingested successfully."
     }
     ```

### 2. **Real-Time Updates**
   - **Endpoint**: `POST /api/webhook`
   - **Description**: Handles real-time updates from Google Sheets via webhook.
   - **Request Body**: Automatically sent by Google Sheets webhook.
   - **Response**:
     ```json
     {
       "status": "success",
       "message": "Update processed successfully."
     }
     ```

---

## How It Works

### 1. **Data Ingestion**
The `ingestSpreadsheet` function:
- Fetches spreadsheet data using the Google Sheets API.
- Identifies headers and blocks using the `splitIntoTableBlocks` function.
- Creates nodes and relationships in the Neo4j graph database:
  - **Table** nodes for each sheet.
  - **Column** nodes linked to tables.
  - **Row** nodes linked to tables.
  - **Cell** nodes linked to rows and columns.
  - **Formula** nodes linked to cells.
  - **Constant** nodes linked to cells.

### 2. **Real-Time Updates**
The webhook endpoint listens for changes in the Google Sheet:
- Updates the corresponding nodes and relationships in the Neo4j graph database.
- Handles formula dependencies and constant values dynamically.

---

## Ngrok Integration
Ngrok is used to expose the local server to the internet for webhook integration. Follow these steps:
1. Install Ngrok:
   ```bash
   npm install -g ngrok
   ```
2. Start Ngrok:
   ```bash
   ngrok http 3000
   ```
3. Use the generated Ngrok URL to configure the webhook in Google Sheets.

---

## Development

### Scripts
- **Start Server**:
  ```bash
  npm start
  ```
- **Run Tests**:
  ```bash
  npm test
  ```

### Code Structure
- **`src/modules/ingest.ts`**:
  Contains the logic for ingesting spreadsheet data and creating nodes/relationships in Neo4j.
- **`src/index.ts`**:
  Entry point for the application, sets up the server and routes.

---

## Contributing
Feel free to open issues or submit pull requests to improve the project.

---

## License
This project is licensed under the MIT License.
