# Header section
# Define incrementing schema version number
SET @schema_version = '35';

# Change campaign response field type to TEXT

# Create ALTER TABLE PROCEDURE
DROP PROCEDURE IF EXISTS `alterbyregexp`;
CREATE PROCEDURE `alterbyregexp` (`table_regexp` VARCHAR(255), `altertext` VARCHAR(255))
BEGIN
DECLARE done INT DEFAULT FALSE;
DECLARE tbl VARCHAR(255);
DECLARE curs CURSOR FOR SELECT table_name FROM information_schema.tables WHERE table_schema = (SELECT DATABASE()) and table_name like table_regexp;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
OPEN curs;

read_loop: LOOP
FETCH curs INTO tbl;
IF done THEN
  LEAVE read_loop;
END IF;
SET @query = CONCAT('ALTER TABLE `', tbl, '`' , altertext);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
END LOOP;
CLOSE curs;
END;

# Add field device_type to campaign_tracker
CALL alterbyregexp('campaign\_\_%', 'CHANGE `response` `response` TEXT  CHARACTER SET utf8mb4  COLLATE utf8mb4_general_ci  NULL');
DROP PROCEDURE IF EXISTS `alterbyregexp`;

ALTER TABLE `campaign` CHANGE `response` `response` TEXT  CHARACTER SET utf8mb4  COLLATE utf8mb4_general_ci  NULL;

# Footer section. Updates schema version in settings
LOCK TABLES `settings` WRITE;
INSERT INTO `settings` (`key`, `value`) VALUES('db_schema_version', @schema_version) ON DUPLICATE KEY UPDATE `value`=@schema_version;
UNLOCK TABLES;
