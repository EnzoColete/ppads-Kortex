-- Update alert_type enum to match Prisma mapping
ALTER TYPE alert_type RENAME VALUE '30days' TO 'days30';
ALTER TYPE alert_type RENAME VALUE '40days' TO 'days40';
ALTER TYPE alert_type RENAME VALUE '50days' TO 'days50';
ALTER TYPE alert_type RENAME VALUE '60days' TO 'days60';

