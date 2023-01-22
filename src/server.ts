import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "pg";
import { INewResource } from "./interfaces";

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
    ORDER BY post_date
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
app.post<{ userid: string; resourceid: string }, {}, { liked: boolean }>(
  "/likes/:resourceid/:userid",
  async (req, res) => {
    const currentReaction = req.body.liked;
    const userId = req.params.userid;
    const resourceId = req.params.resourceid;

    try {
      client.query("BEGIN");
      //check if reaction exists in table
      const checkForReactionValues = [userId, resourceId];
      const checkForReaction = await client.query(
        "SELECT * FROM likes WHERE user_id = $1 AND resource_id = $2",
        checkForReactionValues
      );

      //if reaction exists and old reaction = current reaction
      if (
        checkForReaction.rows.length > 0 &&
        currentReaction === checkForReaction.rows[0].liked
      ) {
        const userReaction = currentReaction ? "liked" : "disliked";
        res.json({
          "message:": `User has already ${userReaction} this resource!`,
        });

        //if reaction exists and user wants to cahange theri reaction (from liked -> disliked or disliked -> liked)
      } else if (checkForReaction.rows.length > 0) {
        //update likes table
        const changeToDislikeValues = [currentReaction, userId, resourceId];
        const changeToDislikeResponse = await client.query(
          "UPDATE likes SET liked = $1 WHERE user_id = $2 AND resource_id = $3 RETURNING *;",
          changeToDislikeValues
        );
        //update resources table
        const updateResourceTableValues = [resourceId];
        const updateResourceTableQuery = currentReaction
          ? `UPDATE resources 
        SET likes = likes + 1, dislikes = dislikes - 1
        WHERE id = $1 RETURNING *;`
          : `UPDATE resources 
        SET likes = likes - 1, dislikes = dislikes + 1
        WHERE id = $1 RETURNING *;`;
        const updateResourceTableResponse = await client.query(
          updateResourceTableQuery,
          updateResourceTableValues
        );
        res.status(200).json({
          Reaction: changeToDislikeResponse.rows[0],
          Resource: updateResourceTableResponse.rows[0],
        });

        //if reaction does not exist in table then....
      } else if (checkForReaction.rows.length < 1) {
        //Add reaction to likes table
        console.log("Adding a reaction to likes table");
        const postAReactionValues = [resourceId, userId, currentReaction];
        const postAReactionResponse = await client.query(
          "INSERT INTO likes (resource_id, user_id, liked) VALUES ($1, $2, $3) RETURNING *",
          postAReactionValues
        );

        //Update reactions in resources table
        const resourceQueryValues = [resourceId];
        let resourceQueryString = "";
        if (currentReaction === true) {
          resourceQueryString = `UPDATE resources 
        SET likes = likes + 1
        WHERE id = $1 RETURNING *;`;
        } else {
          resourceQueryString = `UPDATE resources 
        SET dislikes = dislikes + 1
        WHERE id = $1 RETURNING *;`;
        }
        const resourcesQueryResponse = await client.query(
          resourceQueryString,
          resourceQueryValues
        );

        res.status(200).json({
          Reaction: postAReactionResponse.rows[0],
          Resource: resourcesQueryResponse.rows[0],
        });
      }
      client.query("COMMIT");
    } catch (error) {
      console.error(error);
      res.status(404).json({ message: "error, adding like to database" });
    }
  }
);

//------------------------------------------------post a resource to DB
app.post<{ userid: string }, {}, { newResourceData: INewResource }>(
  "/resources/:userid",
  async (req, res) => {
    const { title, link, description, tags, type, usage } =
      req.body.newResourceData;
    try {
      const queryValues = [
        req.params.userid,
        title,
        link,
        description,
        tags,
        type,
        usage,
      ];
      const queryResponse = await client.query(
        `
    INSERT INTO RESOURCES (user_id,
      title,
      link,
      description,
      tags,
      type,
      usage)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
    `,
        queryValues
      );
      const newlyCreatedPost = queryResponse.rows[0];
      res.status(200).json(newlyCreatedPost);
    } catch (error) {
      console.error(error);
      res.status(404).json({ message: "error, posting a new post to DB" });
    }
  }
);

app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
``;
