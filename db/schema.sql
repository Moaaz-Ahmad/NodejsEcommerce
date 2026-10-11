-- Run automatically at startup (CREATE IF NOT EXISTS, so it never touches existing data).
-- Product name is the unique key: the UNIQUE index (case/accent-insensitive collation) enforces it.
CREATE TABLE IF NOT EXISTS products (
  id        VARCHAR(255) NOT NULL PRIMARY KEY,
  title     VARCHAR(255) NOT NULL UNIQUE,
  price     DOUBLE       NOT NULL,
  imageUrl  LONGTEXT     NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS cart (
  username  VARCHAR(64)  NOT NULL,
  productId VARCHAR(255) NOT NULL,
  qty       INT          NOT NULL DEFAULT 1,
  PRIMARY KEY (username, productId),
  FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id       VARCHAR(36)  NOT NULL PRIMARY KEY,
  username VARCHAR(64)  NOT NULL,
  total    DOUBLE       NOT NULL,
  placedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX (username)
);

-- price/title are snapshots so later product edits or deletes don't rewrite history
CREATE TABLE IF NOT EXISTS order_items (
  id      INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  orderId VARCHAR(36)  NOT NULL,
  title   VARCHAR(255) NOT NULL,
  price   DOUBLE       NOT NULL,
  qty     INT          NOT NULL,
  FOREIGN KEY (orderId) REFERENCES orders (id) ON DELETE CASCADE
);
