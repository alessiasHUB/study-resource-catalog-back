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

//------------------------------------------------gets a specific resource if it matches the link
app.get<{}, {}, {}, { link: string }>("/resources/link", async (req, res) => {
  try {
    const queryLink = [req.query.link];
    const queryResponse = await client.query(
      `
    SELECT * 
    FROM resources
    WHERE link = $1
    `,
      queryLink
    );
    const matchingResource = queryResponse.rows;
    console.log(matchingResource);
    res.status(200).json(matchingResource);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: "error, get a specific resource" });
  }
});

//------------------------------------------------gets likes given a user_id
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
//----------------------------------------------- get study list RESOURCES

//========================POST================================

//-------------------------------------------------------posts likes given a resource_id and a user_id
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

      //--------- If reaction exists and old reaction = current reaction ----------
      if (
        checkForReaction.rows.length > 0 &&
        currentReaction === checkForReaction.rows[0].liked
      ) {
        const userReaction = currentReaction ? "liked" : "disliked";
        res.json({
          "message:": `User has already ${userReaction} this resource!`,
        });

        //------ If reaction exists and user wants to change their reaction --------
        //(from liked -> disliked or disliked -> liked)
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

        //-------- If reaction does not exist in table then --------
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

//========================DELETE================================

app.delete<{ resource_id: string; user_id: string }>(
  "/study_list/:resource_id/:user_id",
  async (req, res) => {
    try {
      const queryValues = [req.params.resource_id, req.params.user_id];
      const queryResponse = await client.query(
        `DELETE FROM study_list
      WHERE resource_id = $1
      AND user_id = $2
      RETURNING *`,
        queryValues
      );
      const deletedItem = queryResponse.rows[0];
      res.status(200).json(deletedItem);
    } catch (error) {
      console.log(error);
      res
        .status(404)
        .json({ message: "could not delete item: internal server error" });
    }
  }
);

app.delete<{ resource_id: string; user_id: string }, {}, {}, { liked: string }>(
  "/likes/:resource_id/:user_id",
  async (req, res) => {
    try {
      await client.query("BEGIN;");
      const queryValuesDeletingFromLikesTable = [
        req.params.resource_id,
        req.params.user_id,
      ];

      const responseDeletingFromLikesTable = await client.query(
        "DELETE FROM likes WHERE resource_id = $1 AND user_id = $2 RETURNING *;",
        queryValuesDeletingFromLikesTable
      );

      const queryValuesUpdatingResourceTable = [req.params.resource_id];

      let queryTextUpdatingResourceTable =
        "UPDATE resources SET likes = likes - 1 WHERE id = $1 RETURNING *;";
      if (req.query.liked === "false") {
        queryTextUpdatingResourceTable =
          "UPDATE resources SET dislikes = dislikes - 1 WHERE id = $1 RETURNING *;";
      }
      const queryResResourceTable = await client.query(
        queryTextUpdatingResourceTable,
        queryValuesUpdatingResourceTable
      );
      await client.query("COMMIT;");
      const deletedReaction = queryResResourceTable.rows[0];
      res.status(200).json(deletedReaction);
    } catch (error) {
      console.error(error);
      res.status(404).json({
        message:
          "could not delete reaction from likes table: internal server error",
      });
    }
  }
);

app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
