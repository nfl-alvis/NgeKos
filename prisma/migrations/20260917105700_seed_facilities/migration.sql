INSERT INTO "facilities" ("key", "name_id", "name_en", "icon") VALUES
  ('wifi', 'WiFi', 'WiFi', 'wifi'),
  ('ac', 'AC', 'Air conditioning', 'ac'),
  ('bathroom-in', 'Kamar mandi dalam', 'Private bathroom', 'bathroom-in'),
  ('parking', 'Parkir', 'Parking', 'parking'),
  ('kitchen', 'Dapur', 'Kitchen', 'kitchen'),
  ('laundry', 'Laundry', 'Laundry', 'laundry'),
  ('bed', 'Tempat tidur', 'Bed', 'bed'),
  ('wardrobe', 'Lemari', 'Wardrobe', 'wardrobe'),
  ('desk', 'Meja belajar', 'Study desk', 'desk'),
  ('fridge', 'Kulkas', 'Refrigerator', 'fridge'),
  ('hot-water', 'Air panas', 'Hot water', 'hot-water'),
  ('cctv', 'CCTV', 'CCTV', 'cctv'),
  ('access-24h', 'Akses 24 jam', '24-hour access', 'access-24h')
ON CONFLICT ("key") DO UPDATE SET
  "name_id" = EXCLUDED."name_id",
  "name_en" = EXCLUDED."name_en",
  "icon" = EXCLUDED."icon";
