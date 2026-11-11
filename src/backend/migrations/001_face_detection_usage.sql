CREATE TABLE face_detection_usage (
  period_start DATE PRIMARY KEY CHECK (EXTRACT(DAY FROM period_start) = 1),
  request_count INTEGER NOT NULL CHECK (request_count BETWEEN 0 AND 900)
);
