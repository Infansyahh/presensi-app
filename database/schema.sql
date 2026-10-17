-- =====================================================================
--  Sistem Absensi Wajah Sekolah - Skema Basis Data
--  Target  : MySQL 8.x / MariaDB 10.4+ (XAMPP)
--  Charset : utf8mb4 (mendukung emoji pada nama)
--  Jalankan: mysql -u root -p < database/schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `absensi_wajah`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `absensi_wajah`;

-- Urutan drop mengikuti dependensi terbalik (anak -> induk).
DROP TABLE IF EXISTS `absensi_log`;
DROP TABLE IF EXISTS `wajah_terdaftar`;
DROP TABLE IF EXISTS `wali_kelas`;
DROP TABLE IF EXISTS `perangkat_absen`;
DROP TABLE IF EXISTS `siswa`;
DROP TABLE IF EXISTS `guru`;
DROP TABLE IF EXISTS `mata_pelajaran`;
DROP TABLE IF EXISTS `orang_tua`;
DROP TABLE IF EXISTS `kelas`;

-- ---------------------------------------------------------------------
--  kelas  (pendukung: acuan kelas_id pada siswa & wali_kelas)
-- ---------------------------------------------------------------------
CREATE TABLE `kelas` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama_kelas`    VARCHAR(50)  NOT NULL COMMENT 'Contoh: X IPA 1',
  `tingkat`       TINYINT UNSIGNED NOT NULL COMMENT '1 - 12',
  `tahun_ajaran`  VARCHAR(20)  NOT NULL COMMENT 'Contoh: 2026/2027',
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kelas_nama_tahun` (`nama_kelas`, `tahun_ajaran`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  orang_tua
-- ---------------------------------------------------------------------
CREATE TABLE `orang_tua` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama_ortu`    VARCHAR(100) NOT NULL,
  `no_whatsapp`  VARCHAR(20)  NOT NULL COMMENT 'Format internasional, mis. 6281234567890',
  `email`        VARCHAR(100) DEFAULT NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ortu_whatsapp` (`no_whatsapp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  mata_pelajaran
-- ---------------------------------------------------------------------
CREATE TABLE `mata_pelajaran` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode_mapel`  VARCHAR(20)  NOT NULL COMMENT 'Contoh: MTK, FKA, BIO',
  `nama_mapel`  VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_mapel_kode` (`kode_mapel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  guru
-- ---------------------------------------------------------------------
CREATE TABLE `guru` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nip`        VARCHAR(20)  NOT NULL,
  `nama`       VARCHAR(100) NOT NULL,
  `email`      VARCHAR(100) NOT NULL,
  `mapel_id`   INT UNSIGNED DEFAULT NULL COMMENT 'Mata pelajaran yang diampu',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_guru_nip` (`nip`),
  UNIQUE KEY `uq_guru_email` (`email`),
  KEY `idx_guru_mapel` (`mapel_id`),
  CONSTRAINT `fk_guru_mapel` FOREIGN KEY (`mapel_id`)
    REFERENCES `mata_pelajaran` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  siswa
-- ---------------------------------------------------------------------
CREATE TABLE `siswa` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nisn`       VARCHAR(10)  NOT NULL,
  `nama`       VARCHAR(100) NOT NULL,
  `kelas_id`   INT UNSIGNED NOT NULL,
  `ortu_id`    INT UNSIGNED DEFAULT NULL,
  `aktif`      TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '0 = tidak aktif/lulus',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_siswa_nisn` (`nisn`),
  KEY `idx_siswa_kelas` (`kelas_id`),
  KEY `idx_siswa_ortu` (`ortu_id`),
  CONSTRAINT `fk_siswa_kelas` FOREIGN KEY (`kelas_id`)
    REFERENCES `kelas` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_siswa_ortu` FOREIGN KEY (`ortu_id`)
    REFERENCES `orang_tua` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  wali_kelas
-- ---------------------------------------------------------------------
CREATE TABLE `wali_kelas` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `guru_id`       INT UNSIGNED NOT NULL,
  `kelas_id`      INT UNSIGNED NOT NULL,
  `tahun_ajaran`  VARCHAR(20)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wali_kelas_tahun` (`kelas_id`, `tahun_ajaran`),
  KEY `idx_wali_guru` (`guru_id`),
  CONSTRAINT `fk_wali_guru` FOREIGN KEY (`guru_id`)
    REFERENCES `guru` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_wali_kelas` FOREIGN KEY (`kelas_id`)
    REFERENCES `kelas` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  wajah_terdaftar
--  Satu siswa boleh punya >1 baris (beberapa sampel vektor wajah).
--  vector_data = JSON array berisi 128 float hasil ekstraksi face-api.
-- ---------------------------------------------------------------------
CREATE TABLE `wajah_terdaftar` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `siswa_id`    INT UNSIGNED NOT NULL,
  `vector_data` JSON         NOT NULL COMMENT 'Array 128 float [-1..1]',
  `label`       VARCHAR(50)  DEFAULT NULL COMMENT 'Keterangan sampel, mis. "sampel-1"',
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wajah_siswa` (`siswa_id`),
  CONSTRAINT `chk_wajah_vector_128` CHECK (JSON_LENGTH(`vector_data`) = 128),
  CONSTRAINT `fk_wajah_siswa` FOREIGN KEY (`siswa_id`)
    REFERENCES `siswa` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  perangkat_absen  (kamera/kit absen di titik masuk)
-- ---------------------------------------------------------------------
CREATE TABLE `perangkat_absen` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama_perangkat` VARCHAR(100) NOT NULL,
  `lokasi`         VARCHAR(150) NOT NULL,
  `secret_key`     VARCHAR(64)  NOT NULL COMMENT 'Token auth perangkat, sha256/UUID',
  `aktif`          TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_perangkat_secret` (`secret_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  absensi_log  (satu catatan per siswa per tanggal)
-- ---------------------------------------------------------------------
CREATE TABLE `absensi_log` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `siswa_id`      INT UNSIGNED NOT NULL,
  `tanggal`       DATE         NOT NULL,
  `waktu_masuk`   TIME         DEFAULT NULL COMMENT 'Kosong bila status Izin/Sakit/Alpa',
  `waktu_keluar`  TIME         DEFAULT NULL,
  `status`        ENUM('Hadir','Terlambat','Izin','Sakit','Alpa') NOT NULL DEFAULT 'Hadir',
  `confidence`    DECIMAL(5,4) DEFAULT NULL COMMENT 'Skor kemiripan 0..1 (faceMatcher)',
  `foto_bukti`    VARCHAR(255) DEFAULT NULL COMMENT 'Path/URL foto saat absen',
  `perangkat_id`  INT UNSIGNED DEFAULT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_absensi_siswa_tanggal` (`siswa_id`, `tanggal`),
  KEY `idx_absensi_tanggal` (`tanggal`),
  KEY `idx_absensi_status` (`status`),
  KEY `idx_absensi_perangkat` (`perangkat_id`),
  CONSTRAINT `fk_absensi_siswa` FOREIGN KEY (`siswa_id`)
    REFERENCES `siswa` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_absensi_perangkat` FOREIGN KEY (`perangkat_id`)
    REFERENCES `perangkat_absen` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;