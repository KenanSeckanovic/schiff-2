-- Copyright (C) 2022 - present Juergen Zimmermann, Hochschule Karlsruhe
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

-- Aufruf:
-- docker compose exec db bash
-- psql --dbname=buch --username=postgres --file=/sql/copy-csv.sql

SET search_path TO schiff;

TRUNCATE schiff.kiste, schiff.offizier, schiff.schiff RESTART IDENTITY CASCADE;

-- https://www.postgresql.org/docs/current/sql-copy.html
COPY schiff FROM '/csv/schiff.csv' (FORMAT csv, DELIMITER ';', HEADER true);
COPY offizier FROM '/csv/offizier.csv' (FORMAT csv, DELIMITER ';', HEADER true);
COPY kiste FROM '/csv/kiste.csv' (FORMAT csv, DELIMITER ';', HEADER true);
