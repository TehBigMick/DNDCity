CREATE TABLE IF NOT EXISTS orders (
  session_key TEXT PRIMARY KEY NOT NULL,
  sku TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'paid', 'failed'))
);
