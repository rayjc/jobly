DROP TABLE IF EXISTS companies;

CREATE TABLE companies (
    handle text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    num_employees integer,
    description text,
    logo_url text
);


INSERT INTO companies (handle, name, num_employees, description, logo_url)
VALUES ('goog', 'Google', 10000, 'An internet company', 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png');
INSERT INTO companies (handle, name, num_employees, description, logo_url)
VALUES ('appl', 'Apple', 11000, 'An OS maker', 'https://www.apple.com/ac/structured-data/images/open_graph_logo.png?201809210816');
