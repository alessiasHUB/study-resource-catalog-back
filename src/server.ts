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
app.post<{ userid: string; resourceid: string; liked: string }>(
  "/likes/:resourceid/:userid/:liked",
  async (req, res) => {
    try {
      client.query("BEGIN");
      //check if reaction exists in table
      const checkForReactionValues = [req.params.userid, req.params.resourceid];
      const checkForReaction = await client.query(
        "SELECT * FROM likes WHERE user_id = $1 AND resource_id = $2",
        checkForReactionValues
      );

      //check if reaction exists
      if (checkForReaction.rows.length > 0) {
        //check for current reaction type | "true" = like | "false" = dislike
        if (checkForReaction.rows[0].liked === true) {
          console.log("Reaction Exists already and is a like");
          //check if user wants to like or dislike
          if (req.params.liked === "true") {
            res.json({ "message:": "User has already liked resource" });
          } else if (req.params.liked === "false") {
            const changeToDislikeValues = [
              req.params.userid,
              req.params.resourceid,
            ];
            const changeToDislikeResponse = await client.query(
              " UPDATE likes SET liked = false WHERE user_id = $1 AND resource_id = $2 RETURNING *;",
              changeToDislikeValues
            );
            //update resources table
            const updateResourceTableValues = [req.params.resourceid];
            const updateResourceTableResponse = await client.query(
              `UPDATE resources 
            SET likes = likes - 1, dislikes = dislikes + 1
            WHERE id = $1 RETURNING *;`,
              updateResourceTableValues
            );
            res.status(200).json({
              Reaction: changeToDislikeResponse.rows[0],
              Resource: updateResourceTableResponse.rows[0],
            });
          }

          //check for current reaction type | "true" = like | "false" = dislike
        } else if (checkForReaction.rows[0].liked === false) {
          console.log("Reaction Exists already and is a dislike");
          //check if user wants to like or dislike
          if (req.params.liked === "true") {
            const changeTolikeValues = [
              req.params.userid,
              req.params.resourceid,
            ];
            const changeTolikeResponse = await client.query(
              " UPDATE likes SET liked = true WHERE user_id = $1 AND resource_id = $2 RETURNING *;",
              changeTolikeValues
            );
            //update resources table
            const updateResourceTableValues = [req.params.resourceid];
            const updateResourceTableResponse = await client.query(
              `UPDATE resources 
            SET likes = likes + 1, dislikes = dislikes - 1
            WHERE id = $1 RETURNING *;`,
              updateResourceTableValues
            );
            res.status(200).json({
              Reaction: changeTolikeResponse.rows[0],
              Resource: updateResourceTableResponse.rows[0],
            });
          } else if (req.params.liked === "false") {
            res.json({ "message:": "User has already disliked resource" });
          }
        }

        //if reaction does not exist then....
      } else if (checkForReaction.rows.length < 1) {
        //Add reaction to likes table
        console.log("Adding a reaction to likes table");
        const postAReactionValues = [
          req.params.resourceid,
          req.params.userid,
          req.params.liked,
        ];
        const postAReactionResponse = await client.query(
          "INSERT INTO likes (resource_id, user_id, liked) VALUES ($1, $2, $3) RETURNING *",
          postAReactionValues
        );

        //Update reactions in resources table
        const resourceQueryValues = [req.params.resourceid];
        let resourceQueryString = "";
        if (req.params.liked === "true") {
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
