DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS users;

CREATE TABLE companies (
    handle text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    num_employees integer,
    description text,
    logo_url text
);

CREATE TABLE jobs (
    id serial PRIMARY KEY,
    title text NOT NULL,
    salary double precision NOT NULL CHECK (salary >= 0.0),
    equity double precision NOT NULL CHECK (equity >= 0.0 AND equity <= 1.0),
    date_posted date NOT NULL DEFAULT CURRENT_DATE,
    company_handle text NOT NULL REFERENCES companies ON DELETE CASCADE
);

CREATE TABLE users (
    username text PRIMARY KEY,
    password text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL UNIQUE,
    photo_url text,
    is_admin boolean NOT NULL DEFAULT FALSE
);


-- companies
INSERT INTO companies (handle, name, num_employees, description, logo_url)
    VALUES ('goog', 'Google', 10000, 'An internet company', 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png');
INSERT INTO companies (handle, name, num_employees, description, logo_url)
    VALUES ('appl', 'Apple', 11000, 'An OS maker', 'https://www.apple.com/ac/structured-data/images/open_graph_logo.png?201809210816');
-- jobs
INSERT INTO jobs (title, salary, equity, date_posted, company_handle)
    VALUES ('Software Engineer I', 150000.0, 0.0001, '2019-09-08', 'goog');
INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ('Software Engineer II', 200000.0, 0.0002, 'goog');
INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ('Software Engineer I', 150000.0, 0.0002, 'appl');
-- users
INSERT INTO users (username, password, first_name, last_name, email, photo_url)
    VALUES ('testuser', 'raw_password', 'Test', 'User', 'test@test.com', 'http://www.google.com');
INSERT INTO users (username, password, first_name, last_name, email, photo_url, is_admin)
    VALUES ('testadmin', 'raw_password', 'Test', 'Adim', 'admin@test.com', 'http://www.google.com', TRUE);