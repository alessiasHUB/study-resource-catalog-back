
-- --------------------------Create resources table
DROP TABLE IF EXISTS resources;

CREATE TABLE resources (
id SERIAL primary key,
user_id INT,
title VARCHAR(50) NOT NULL,
link VARCHAR(500) NOT NULL,
description VARCHAR(500),
tags TEXT[],
type VARCHAR(100) NOT NULL,
usage VARCHAR(50) NOT NULL,
post_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
likes INT DEFAULT 0,
FOREIGN KEY (user_id) REFERENCES users(id) );


-- --------------------------Create likes table
DROP TABLE IF EXISTS likes;

CREATE TABLE likes (
id SERIAL,
user_id INT,
resource_id INT,FOREIGN KEY (user_id) REFERENCES users(id),
liked BOOLEAN,
PRIMARY KEY (user_id, resource_id),
FOREIGN KEY (resource_id) REFERENCES resources(id)
);

----------------------------------Create Table Comments 
 drop table if exists comments ;
create table comments (
	id serial primary key,
    resource_id int,
    user_id int,
    post_date timestamp not null default current_timestamp,
    text varchar(500),
    foreign key (resource_id) references resources(id),
    foreign key (user_id) references users(id)
    );