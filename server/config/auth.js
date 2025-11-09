import GitHubStrategy from "passport-github2";
import pool from "./database.js";

/* Note: callbackURL must be changed later with our published link */
const options = {
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/github/callback",
  scope: ["read:user", "user:email"],
};

const verify = async (accessToken, refreshToken, profile, callback) => {
  const {
    _json: { id, login, avatar_url },
    emails,
  } = profile;

  const email = emails && emails.length > 0 ? emails[0].value : null;

  const userData = {
    githubId: id,
    username: login,
    email: email,
    avatarUrl: avatar_url,
  };

  try {
    const results = await pool.query(
      "SELECT * FROM users WHERE githubid = $1",
      [userData.githubId]
    );

    const user = results.rows[0];

    if (!user) {
      const newResults = await pool.query(
        `INSERT INTO users (githubid, username, email, avatarurl)
         VALUES($1, $2, $3, $4)
         RETURNING *`,
        [
          userData.githubId,
          userData.username,
          userData.email,
          userData.avatarUrl,
        ]
      );

      const newUser = newResults.rows[0];
      return callback(null, newUser);
    }
    return callback(null, user);
  } catch (error) {
    return callback(error);
  }
};

export const GitHub = new GitHubStrategy(options, verify);
