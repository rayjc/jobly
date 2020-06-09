// connect to right DB --- set before loading db.js
process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../../app");
const db = require("../../db");


describe("Companies routes test", function() {

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


  describe("GET /companies", function() {
    test("returns an array of one company", async function() {
      const res = await request(app).get("/companies");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ companies: [company] });
    });

    test("returns a company", async function() {
      const res = await request(app).get(`/companies/${company.handle}`);

      expect(res.statusCode).toBe(200);
      job.date_posted = expect.any(String);
      company.jobs = [job];
      expect(res.body).toEqual({ company });
    });

    test("fails to find a company and returns 404", async function() {
      const res = await request(app).get(`/companies/${company.handle}-dne`);

      expect(res.statusCode).toBe(404);
    });
  });


  describe("POST /companies", function() {
    test("creates a company in database and returns it", async function() {
      company.handle = "newTest";
      company.name = "New Test Company";
      const res = await request(app).post("/companies").send(company);

      expect(res.statusCode).toBe(201);
      const dbResult = (await request(app).get(`/companies/${company.handle}`)).body;
      delete dbResult.company.jobs;  // GET /:handle returns an array of jobs as well
      expect(res.body).toEqual(dbResult);
    });

    test("fails to create company with duplicate handle (PK) and returns 403", async function() {
      company.name = "New Test Company";
      const res = await request(app).post("/companies").send(company);

      expect(res.status).toBe(403);
    });

    test("fails to create company with duplicate name and returns 403", async function() {
      company.handle = "newTest";
      const res = await request(app).post("/companies").send(company);

      expect(res.status).toBe(403);
    });
  });

  describe("POST /companies, validations", function() {
    test.each([
      "handle", "name"
    ])("fails with 400 for missing %s data", async (field) => {
      delete company[field];
      const res = await request(app)
        .post("/companies")
        .send(company);

      expect(res.status).toBe(400);
    });

    test.each([
      "handle", "name", "description", "logo_url"
    ])("fails with 400 for invalid type, %s must be a string", async (field) => {
      company[field] = 0;
      const res = await request(app)
        .post("/companies")
        .send(company);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid type, num_employees must be a number", async function() {
      company.num_employees = "";
      const res = await request(app)
        .post("/companies")
        .send(company);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid logo_url", async function() {
      company.logo_url = "notAUrl";
      const res = await request(app)
        .post("/companies")
        .send(company);

      expect(res.status).toBe(400);
    });
  });


  describe("PATCH /companies/:handle", function() {
    test("updates a company in database and returns it", async function() {
      company.name = "New Test Company";
      company.num_employees = 200;
      company.description = "An updated company";
      company.logo_url = "http://www.bing.com";
      const res = await request(app).patch(`/companies/${company.handle}`).send(company);

      expect(res.status).toBe(200);
      expect(res.body.company).toEqual(company);
      const dbResult = (await request(app).get(`/companies/${company.handle}`)).body;
      delete dbResult.company.jobs;  // GET /:handle returns an array of jobs as well
      expect(res.body).toEqual(dbResult);
    });

    test("fails to update a non-existing book and returns 404", async function() {
      company.name = "New Test Company";
      company.num_employees = 200;
      company.description = "An updated company";
      company.logo_url = "http://www.bing.com";
      const res = await request(app).patch(`/companies/${company.handle}-dne`).send(company);

      expect(res.status).toBe(404);
    });


  });
  describe("PATCH /companies/:handle, validations", function() {
    test.each([
      "name", "description", "logo_url"
    ])("fails with 400 for invalid type, %s must be a string", async (field) => {
      company[field] = 0;
      const res = await request(app)
        .patch(`/companies/${company.handle}`)
        .send(company);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid type, num_employees must be a number", async function() {
      company.num_employees = "";
      const res = await request(app)
        .patch(`/companies/${company.handle}`)
        .send(company);

      expect(res.status).toBe(400);
    });

    test("fails with 400 for invalid logo_url", async function() {
      company.logo_url = "notAUrl";
      const res = await request(app)
        .patch(`/companies/${company.handle}`)
        .send(company);

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /companies/:handle", function() {
    test("removes a company", async function() {
      const res = await request(app).delete(`/companies/${company.handle}`);

      expect(res.status).toBe(200);
      const { companies } = (await request(app).get("/companies")).body;
      expect(companies.length).toBe(0);
    });

    test("fails to remove a non-existing book and returns 404", async function() {
      const res = await request(app).delete(`/companies/${company.handle}-dne`);

      expect(res.status).toBe(404);
    });
  });
});