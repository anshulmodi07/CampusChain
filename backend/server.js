// server.js does ONLY ONE JOB:
// Start the server

import dotenv from "dotenv";//Imports the dotenv library which is used to read .env file


dotenv.config();//Loads variables from .env
import app from "./app.js";//Imports the Express app object

// If .env has PORT → use it
// Else → fallback to 5000
const PORT = process.env.PORT || 5000;


// Node opens port PORT
// Express starts listening
// Process stays alive
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
