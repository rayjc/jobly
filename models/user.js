const bcrypt = require("bcrypt");

const db = require("../db");
const ExpressError = require("../helpers/expressError");
const { BCRYPT_WORK_FACTOR } = require("../config");


class User {
  constructor(username, password, firstName, lastName, email, photoUrl, isAdmin) {
    this.username = username;
    this.password = password;
    this.first_name = firstName;
    this.last_name = lastName;
    this.email = email;
    this.photo_url = photoUrl;
    this.is_admin = isAdmin;
  }

  get fullName() {
    return `${this.first_name} ${this.last_name}`;
  }

  /** Register new user, returns a User instance */
  static async register(username, password, firstName, lastName, email, photoUrl, isAdmin = false) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    try {
      const result = await db.query(
        `INSERT INTO users
          (username, password, first_name, last_name, email, photo_url, is_admin)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING username, password, first_name, last_name, email, photo_url, is_admin`,
        [username, hashedPassword, firstName, lastName, email, photoUrl, isAdmin]
      );

      const r = result.rows[0];
      const newUser = new User(...Object.values(r));
      return newUser;

    } catch (error) {
      if (error.code === "23505") {
        throw new ExpressError("Username/email already exist.", 403);
      }
      throw error;
    }
  }

  /** Authenticates with username and password, returns boolean. */
  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password FROM users WHERE username = $1`,
      [username]);
    const user = result.rows[0];

    if (user) {
      return await bcrypt.compare(password, user.password);
    }

    throw new ExpressError("Invalid user/password", 401);
  }

  /** Get a user by username, returns a User instance */
  static async get(username) {
    const result = await db.query(
      `SELECT username, password, first_name, last_name, email, photo_url, is_admin
        FROM users
        WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`'${username}' not found`, 404);
    }

    const r = result.rows[0];
    return new User(...Object.values(r));
  }

  /** Get all users; returns an array of User objects */
  static async getAll() {
    const result = await db.query(
      `SELECT username, password, first_name, last_name, email, photo_url, is_admin
        FROM users`
    );

    return result.rows.map(r => new User(...Object.values(r)));
  }

  async update() {
    try {
      const result = await db.query(
        `UPDATE users
          SET first_name=$2, last_name=$3, email=$4, photo_url=$5, is_admin=$6, password=$7
          WHERE username=$1
          RETURNING username, password, first_name, last_name, email, photo_url, is_admin`,
        [this.username, this.first_name, this.last_name, this.email,
        this.photo_url, this.is_admin, this.password]
      );

      if (result.rows.length === 0) {
        throw new ExpressError(`Cannot find ${username}`, 404);
      }

      const r = result.rows[0];
      return new User(...Object.values(r));

    } catch (error) {
      if (error.code === "23505") {
        throw new ExpressError(`${this.email} already exists`, 403);
      }
      throw error;
    }
  }

  /** Delete a row in db based on current instance */
  async delete() {
    const result = await db.query(
      `DELETE FROM users WHERE username=$1 RETURNING *`,
      [this.username]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(`Cannot find ${username}.`, 404);
    }
  }
}


module.exports = User;