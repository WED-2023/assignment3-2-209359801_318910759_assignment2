var express = require("express");
var router = express.Router();

const MySql = require("./utils/MySql");
const DB_utils = require("./utils/DButils");
const bcrypt = require("bcrypt");

// Register
router.post("/Register", async (request, response, next) => {
  try {
    let user_info = {
      username: request.body.username,
      firstname: request.body.firstname,
      lastname: request.body.lastname,
      country: request.body.country,
      password: request.body.password,
      email: request.body.email,
    }
    let users = [];
    users = await DB_utils.execQuery("SELECT username, email FROM users");

    if (users.find((x) => x.username === user_info.username))
      throw { status: 409, message: "Username is already taken" };

    if (users.find((x) => x.email === user_info.email))
      throw { status: 409, message: "Email is already taken" };

    // add the new username
    let hash = bcrypt.hashSync(user_info.password, parseInt(process.env.bcrypt_saltRounds));

    // removed profilePic property
    await DB_utils.execQuery(
    `INSERT INTO users (username, firstname, lastname, country, password, email)
    VALUES ('${user_info.username}', '${user_info.firstname}', '${user_info.lastname}',
            '${user_info.country}', '${hash}', '${user_info.email}')`);

    response.status(201).send({ message: "User created", success: true });
  } catch (error) {
    next(error);
  }
});

// Login
router.post("/Login", async (request, response, next) => {
  try {
    // username check
    const users = await DB_utils.execQuery("SELECT username FROM users");

    if (!users.find((x) => x.username === request.body.username))
      throw { status: 401, message: "Username incorrect" };

    // password check
    const user = (
      await DB_utils.execQuery(
        `SELECT * FROM users WHERE username = '${request.body.username}'`
      )
    )[0];

    if (!bcrypt.compareSync(request.body.password, user.password)) {
      throw { status: 401, message: "Password are incorrect" };
    }

    // Set cookie
    request.session.user_id = user.userID;
    console.log("User logged in with session ID: " + request.session.user_id);

    // return cookie
    response.status(200).send({ message: "login succeeded " , success: true });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post("/Logout", function (req, res) {
  if (!req.session || !req.session.user_id) {
    return res.status(400).send({
      success: false,
      message: "No user is currently logged in"
    });
  }
  console.log("User logged out with session ID: " + req.session.user_id);
  req.session.reset();
  return res.send({
    success: true,
    message: "Logout succeeded"
  });
});


module.exports = router;