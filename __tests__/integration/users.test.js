process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../../app");
const db = require("../../db");


describe("Users routes test", function() {

  let user;

  beforeEach(async function() {
    await db.query(`DELETE FROM users`);

    const result = await db.query(
      `INSERT INTO users
          (username, password, first_name, last_name, email, photo_url, is_admin)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING username, password, first_name, last_name, email, photo_url, is_admin`,
      ["test", "raw_password", "Test", "User", "test@test.come", "http://www.google.com", true]
    );

    user = result.rows[0];
    // remove password since it will not be include in response
    delete user.password;
  });

  afterAll(async function() {
    await db.end();
  });

  describe("GET /users", function() {
    test("returns an array of one user", async function() {
      const res = await request(app).get("/users");

      expect(res.statusCode).toBe(200);
      // filter properties
      delete user.photo_url;
      delete user.is_admin;
      expect(res.body).toEqual({ users: [user] });
    });

    test("returns a user", async function() {
      const res = await request(app).get(`/users/${user.username}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ user });
    });

    test("fails to find a user and returns 404", async function() {
      const res = await request(app).get(`/users/${user.username}-dne`);

      expect(res.statusCode).toBe(404);
    });
  });


  describe("POST /users", function() {
    test("creates a user in database and returns it", async function() {
      user.username = "newTestUser";
      user.email = user.email + "new";
      user.password = "raw_password";
      const res = await request(app).post("/users").send(user);

      expect(res.statusCode).toBe(201);
      const dbResult = (await request(app).get(`/users/${user.username}`)).body;
      expect(res.body).toEqual(dbResult);
    });

    test("fails to create user with duplicate username (PK) and returns 403", async function() {
      user.email = user.email + "new";
      user.password = "raw_password";
      const res = await request(app).post("/users").send(user);

      expect(res.status).toBe(403);
    });

    test("fails to create user with duplicate email and returns 403", async function() {
      user.username = "newTestUser";
      user.password = "raw_password";
      const res = await request(app).post("/users").send(user);

      expect(res.status).toBe(403);
    });
  });


  describe("POST /users, validations", function() {
    test.each([
      "username", "password", "first_name", "last_name", "email"
    ])("fails with 400 for missing %s data", async (field) => {
      const res = await request(app)
        .post("/users")
        .send(user);

      expect(res.status).toBe(400);
    });

    test.each([
      "username", "password", "first_name", "last_name", "email", "photo_url",
    ])("fails with 400 for invalid type, %s must be a string", async (field) => {
      user[field] = 0;
      const res = await request(app)
        .post("/users")
        .send(user);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid type, is_admin must be a boolean", async function() {
      user.is_admin = "test";
      const res = await request(app)
        .post("/users")
        .send(user);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid photo_url", async function() {
      user.photo_url = "notAUrl";
      const res = await request(app)
        .post("/users")
        .send(user);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid email", async function() {
      user.email = "notAnEmail";
      const res = await request(app)
        .post("/users")
        .send(user);

      expect(res.status).toBe(400);
    });
  });


  describe("PATCH /users/:username", function() {
    test("updates a company in database and returns it", async function() {
      user.first_name = "Tony";
      user.last_name = "Stark";
      user.email = "ironman@stark.com";
      user.photo_url = "http://www.google.com/ironman";
      user.is_admin = true;
      delete user.username;   // don't need this field since it's included in url
      const res = await request(app).patch(`/users/test`).send(user);

      expect(res.status).toBe(200);
      user.username = "test";
      expect(res.body.user).toEqual(user);
      const dbResult = (await request(app).get(`/users/${user.username}`)).body;
      expect(res.body).toEqual(dbResult);
    });

    test("fails to update a non-existing user and returns 404", async function() {
      const res = await request(app).patch(`/users/${user.username}-dne`).send(user);

      expect(res.status).toBe(404);
    });

    test("fails to update to a duplicate email and returns 403", async function() {
      const dupUser = {
        username: "dupTest",
        password: "raw_password",
        first_name: "Test",
        last_name: "User",
        email: "test@duplicate.com",
      };
      await request(app).post("/users").send(dupUser);
      delete user.username;   // don't need this field since it's included in url
      user.email = dupUser.email;
      const res = await request(app).patch(`/users/test`).send(user);

      expect(res.status).toBe(403);
    });
  });


  describe("PATCH /users/:username, validations", function() {
    test.each([
      "username", "password", "first_name", "last_name", "email", "photo_url",
    ])("fails with 400 for invalid type, %s must be a string", async (field) => {
      user[field] = 0;
      const res = await request(app)
        .patch(`/users/test`)
        .send(user);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid type, is_admin must be a boolean", async function() {
      user.is_admin = "test";
      const res = await request(app)
        .patch(`/users/${user.username}`)
        .send(user);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid photo_url", async function() {
      user.photo_url = "notAUrl";
      const res = await request(app)
        .patch(`/users/${user.username}`)
        .send(user);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid email", async function() {
      user.email = "notAnEmail";
      const res = await request(app)
        .patch(`/users/${user.username}`)
        .send(user);

      expect(res.status).toBe(400);
    });
  });


  describe("DELETE /users/:username", function() {
    test("removes a user", async function() {
      const res = await request(app).delete(`/users/${user.username}`);

      expect(res.status).toBe(200);
      const { users } = (await request(app).get("/users")).body;
      expect(users.length).toBe(0);
    });

    test("fails to remove a non-existing book and returns 404", async function() {
      const res = await request(app).delete(`/users/${user.username}-dne`);

      expect(res.status).toBe(404);
    });
  });

});