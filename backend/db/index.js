import dotenv from "dotenv";//dotenv’s job = read .env file
import mysql from "mysql2";

// Read DB credentials from .env
dotenv.config(); //  Loads variables from .env

// logs to check if everything is working or any error
console.log("DB_USER =", process.env.DB_USER);
console.log("DB_PASS =", process.env.DB_PASS ? "SET" : "NOT SET");

// Create a MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// Export that connection so any controller can use it
export default db;
