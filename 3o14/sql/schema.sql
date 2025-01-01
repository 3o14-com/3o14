CREATE TABLE IF NOT EXISTS users (
  id Integer not null primary key check (id = 1),
  username text not null unique check (trim(lower(username)) == username
                                       and username <> ''
                                       and length(username) <= 50)
);
