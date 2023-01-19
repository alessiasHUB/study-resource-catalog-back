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
//--------------------------------------------- get comments for resource
app.get<{ resourceid: string }>("/comments/:resourceid", async (req, res) => {
  try {
    const queryValues = [req.params.resourceid];
    const queryResponse = await client.query(
      "SELECT * FROM comments WHERE resource_id = $1",
      queryValues
    );
    const allComments = queryResponse.rows;
    res.status(200).json(allComments);
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ message: "error, get all comments from current resource" });
  }
});
//----------------------------------------------- get study list
app.get<{ userid: string }>("/study_list/:userid", async (req, res) => {
  try {
    const queryValues = [req.params.userid];
    const queryResponse = await client.query(
      `SELECT * FROM study_list WHERE user_id = $1`,
      queryValues
    );
    const allStudyList = queryResponse.rows;
    res.status(200).json(allStudyList);
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: "error, get study list for current user" });
  }
});

//========================POST================================

//------------------------------------------------posts likes given a resource_id and a user_id
app.post<{ userid: string; resourceid: string; liked: string }>(
  "/likes/:resourceid/:userid",
  async (req, res) => {
    try {
      const queryValues = [
        req.params.userid,
        req.params.resourceid,
        req.params.liked,
      ];
      const queryResponse = await client.query(
        `
        INSERT INTO likes (user_id, resource_id, liked)
        VALUES ($1, $2, $3);
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
  }
);
//------------------------------------------------------------------- post a new comment
app.post<{ resourceid: string; userid: string }, {}, { text: string }>(
  "/comments/:userid/:resourceid",
  async (req, res) => {
    try {
      const queryValues = [
        req.params.resourceid,
        req.params.userid,
        req.body.text,
      ];
      const queryResponse = await client.query(
        `insert into comments (resource_id, user_id, text) 
      values ($1, $2, $3) returning *`,
        queryValues
      );
      const newComment = queryResponse.rows[0];
      res.status(200).json(newComment);
    } catch (error) {
      console.log(error);
      res
        .status(404)
        .json({ message: "error, post a new comment on resource" });
    }
  }
);
//-------------------------------------------------------- post a resource onto studyList
app.post<{ resourceid: string; userid: string }>(
  "/study_list/:resourceid/:userid",
  async (req, res) => {
    try {
      const queryValues = [req.params.resourceid, req.params.userid];
      const queryResponse = await client.query(
        `insert into study_list (resource_id, user_id ) values ($1, $2) returning *`,
        queryValues
      );
      const newStudyItem = queryResponse.rows[0];
      res.status(200).json(newStudyItem);
    } catch (error) {
      console.log(error);
      res
        .status(404)
        .json({ message: "post a new resource to user's study list" });
    }
  }
);
app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
``;
