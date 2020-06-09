// connect to right DB --- set before loading db.js
process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../../app");
const db = require("../../db");


describe("Jobs routes test", function() {

  let company;
  let job;

  beforeEach(async function() {
    await db.query(`DELETE FROM jobs`);
    await db.query(`DELETE FROM companies`);

    const companyResult = await db.query(
      `INSERT INTO companies (handle, name, num_employees, description, logo_url)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING handle, name, num_employees, description, logo_url`,
      ["test", "Test Company", 100, "Just a imaginary company.", "http://www.google.com"]
    );

    company = companyResult.rows[0];

    const jobResult = await db.query(
      `INSERT INTO jobs (title, salary, equity, date_posted, company_handle)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, title, salary, equity, date_posted, company_handle`,
      ["Test Title", 100000, 0.5, "2018-10-10", "test"]
    );

    job = jobResult.rows[0];

  });

  afterAll(async function() {
    await db.end();
  });


  describe("GET /jobs", function() {
    test("returns an array of one job", async function() {
      const res = await request(app).get("/jobs");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        jobs: [{ id: job.id, company_handle: job.company_handle, title: job.title }]
      });
    });

    test("returns an array of one job for search query", async function() {
      const res = await request(app).get("/jobs?search=test");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        jobs: [{ id: job.id, company_handle: job.company_handle, title: job.title }]
      });
    });

    test("returns an empty array for min_salary query", async function() {
      const res = await request(app).get("/jobs?min_salary=1000000");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ jobs: [] });
    });

    test("returns an array of one job for min_equity query", async function() {
      const res = await request(app).get("/jobs?min_equity=0.001");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        jobs: [{ id: job.id, company_handle: job.company_handle, title: job.title }]
      });
    });

    test("returns a job", async function() {
      const res = await request(app).get(`/jobs/${job.id}`);

      expect(res.statusCode).toBe(200);
      job.company = company;
      delete job.company_handle;
      job.date_posted = expect.any(String);
      expect(res.body).toEqual({ job });
    });

    test("fails to find a job and returns 404", async function() {
      const res = await request(app).get(`/jobs/${job.id + 100}`);

      expect(res.statusCode).toBe(404);
    });
  });


  describe("POST /jobs", function() {
    test("creates a job in database and returns it", async function() {
      delete job.id;  // no need for id and date_posted to create a job
      delete job.date_posted;
      const res = await request(app).post("/jobs").send(job);

      expect(res.statusCode).toBe(201);
      const dbResult = (await request(app).get(`/jobs/${res.body.job.id}`)).body;
      // /:id returns company object instead of company_handle
      delete dbResult.job.company;
      dbResult.job.company_handle = "test";
      expect(res.body).toEqual(dbResult);
    });

    test("fails to create job under non-existing company and returns 403", async function() {
      delete job.id;  // no need for id and date_posted to create a job
      delete job.date_posted;
      job.company_handle = "dne";
      const res = await request(app).post("/jobs").send(job);

      expect(res.status).toBe(403);
    });
  });

  describe("POST /jobs, validations", function() {
    test.each([
      "title", "salary", "equity", "company_handle"
    ])("fails with 400 for missing %s data", async (field) => {
      delete job[field];
      const res = await request(app)
        .post("/jobs")
        .send(job);

      expect(res.status).toBe(400);
    });

    test.each([
      "title", "company_handle"
    ])("fails with 400 for invalid type, %s must be a string", async (field) => {
      job[field] = 0;
      const res = await request(app)
        .post("/jobs")
        .send(job);

      expect(res.status).toBe(400);
    });

    test.each([
      "salary", "equity"
    ])("fails with 400 for invalid type, %s must be a number", async (field) => {
      job[field] = "";
      const res = await request(app)
        .post("/jobs")
        .send(job);

      expect(res.status).toBe(400);
    });

    test.each([
      "salary", "equity"
    ])("fails with 400 for invalid value, %s must be a number >= 0", async (field) => {
      job[field] = -1;
      const res = await request(app)
        .post("/jobs")
        .send(job);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid value, equity must be <= 1.0", async function() {
      job.equity = 2.0;
      const res = await request(app)
        .post("/jobs")
        .send(job);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid date", async function() {
      job.date = "2000";
      const res = await request(app)
        .post("/jobs")
        .send(job);

      expect(res.status).toBe(400);
    });
  });


  describe("PATCH /jobs/:id", function() {
    test("updates a job in database and returns it", async function() {
      job.title = "new title";
      job.salary = 200000;
      job.equity = 0.8;
      job.date_posted = "2010-10-10";
      const res = await request(app).patch(`/jobs/${job.id}`).send(job);

      expect(res.status).toBe(200);
      job.date_posted = expect.any(String);
      expect(res.body.job).toEqual(job);
      const dbResult = (await request(app).get(`/jobs/${job.id}`)).body;
      // /:id returns company object instead of company_handle
      delete dbResult.job.company;
      dbResult.job.company_handle = "test";
      expect(res.body).toEqual(dbResult);
    });

    test("fails to update a non-existing job and returns 404", async function() {
      const res = await request(app).patch(`/jobs/${job.id + 100}`).send(job);

      expect(res.status).toBe(404);
    });

  });

  describe("PATCH /jobs/:id, validations", function() {
    test.each([
      "title", "company_handle"
    ])("fails with 400 for invalid type, %s must be a string", async (field) => {
      job[field] = 0;
      const res = await request(app)
        .patch(`/jobs/${job.id}`)
        .send(job);

      expect(res.status).toBe(400);
    });

    test.each([
      "salary", "equity"
    ])("fails with 400 for invalid type, %s must be a number", async (field) => {
      job[field] = "";
      const res = await request(app)
        .patch(`/jobs/${job.id}`)
        .send(job);

      expect(res.status).toBe(400);
    });

    test.each([
      "salary", "equity"
    ])("fails with 400 for invalid value, %s must be a number >= 0", async (field) => {
      job[field] = -1;
      const res = await request(app)
        .patch(`/jobs/${job.id}`)
        .send(job);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid value, equity must be <= 1.0", async function() {
      job.equity = 2.0;
      const res = await request(app)
        .patch(`/jobs/${job.id}`)
        .send(job);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid date", async function() {
      job.date = "2000";
      const res = await request(app)
        .patch(`/jobs/${job.id}`)
        .send(job);

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /jobs/:id", function() {
    test("removes a job", async function() {
      const res = await request(app).delete(`/jobs/${job.id}`);

      expect(res.status).toBe(200);
      const { jobs } = (await request(app).get("/jobs")).body;
      expect(jobs.length).toBe(0);
    });

    test("fails to remove a non-existing job and returns 404", async function() {
      const res = await request(app).delete(`/jobs/${job.id + 100}`);

      expect(res.status).toBe(404);
    });
  });
  
});