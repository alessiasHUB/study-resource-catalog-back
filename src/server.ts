import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "pg";

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const PORT_NUMBER = process.env.PORT ?? 4000;
const client = new Client(process.env.DATABASE_URL);
client.connect();
//comment
interface user {
  id: number;
  username: string;
  isFaculty: boolean;
}

//========================GET================================

//------------------------------------------------gets all users
app.get("/users", async (req, res) => {
  try {
    const queryResponse = await client.query(`
    SELECT * 
    FROM users
    `);
    const allUsers = queryResponse.rows;
    res.status(200).json(allUsers);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: "error, get all users" });
  }
});

//------------------------------------------------gets all information for specific user
app.get("/users/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const queryResponse = await client.query(
      `
    SELECT * FROM users
    WHERE username = $1`,
      [username]
    );
    const loggedInUser = queryResponse.rows[0];
    res.status(200).json(loggedInUser);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: "error, get one user" });
  }
});

//------------------------------------------------gets all resources
app.get("/resources", async (req, res) => {
  try {
    const queryResponse = await client.query(`
    SELECT * 
    FROM resources
    `);
    const allResources = queryResponse.rows;
    res.status(200).json(allResources);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: "error, get all resources" });
  }
});

//------------------------------------------------gets likes given a resource_id
app.get<{ userid: string }>("/likes/:userid", async (req, res) => {
  try {
    const queryValues = [req.params.userid];
    const queryResponse = await client.query(
      `
    SELECT *
    FROM likes
    WHERE user_id = $1
    `,
      queryValues
    );
    const allLikeReactions = queryResponse.rows;
    res.status(200).json(allLikeReactions);
  } catch (error) {
    console.error(error);
    res
      .status(404)
      .json({ message: "error, get all like reactions for current user" });
  }
});

//========================POST================================

//------------------------------------------------posts likes given a resource_id and a user_id
app.post<{ userid: string; resourceid: string; liked: string }>(
  "/likes/:resourceid/:userid/:liked",
  async (req, res) => {
    try {
      client.query("BEGIN");

      //Update likes in resources table
      const resourceQueryValues = [req.params.resourceid];
      let resourceQueryString = "";
      if (req.params.liked) {
        resourceQueryString = `UPDATE resources 
        SET likes = likes + 1
        WHERE id = $1;`;
      } else {
        resourceQueryString = `UPDATE resources 
        SET dislikes = dislikes + 1
        WHERE id = $1;`;
      }
      const resourcesQueryResponse = await client.query(
        resourceQueryString,
        resourceQueryValues
      );

      //INSERT like into likes table
      const likesQueryValues = [
        req.params.resourceid,
        req.params.userid,
        req.params.liked,
      ];
      const likesQueryResponse = await client.query(
        `
        INSERT INTO likes (resource_id, user_id, liked)
          VALUES ($1, $2, $3)
          ON CONFLICT (resource_id, user_id)
          DO UPDATE SET liked = False
          RETURNING *;
    `,
        likesQueryValues
      );
      const allLikeReactions = likesQueryResponse.rows;
      client.query("COMMIT");
      res.status(200).json({ message: "Like added successfully" });
    } catch (error) {
      console.error(error);
      res.status(404).json({ message: "error, adding like to database" });
    }
  }
);

app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
``;
