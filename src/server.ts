import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "pg"

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const PORT_NUMBER = process.env.PORT ?? 4000;
const client = new Client(process.env.DATABASE_URL);
client.connect();

interface user {
  id: number;
  username: string;
  isFaculty: boolean;
}

app.get('/users', async (req, res) => {
  try {
    const username = req.body.username
    const queryResponse = await client.query(`
    SELECT * FROM users
    WHERE username = $1`, [username])
    const loggedInUser = queryResponse.rows[0]
    res.status(200).json(loggedInUser)
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: "internal error" });
  }
})


app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
