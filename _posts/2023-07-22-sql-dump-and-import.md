---
layout: application
title: SQL dump and import
categories: postgresql
date: 2023-07-22
---
### SQL dump and import

### [PostgreSQL](https://www.postgresql.org)

#### Install

##### macOS

```shell
brew install postgresql
brew services start postgresql  # 启动服务
brew services stop postgresql   # 停止服务
```

##### Ubuntu

```shell
sudo apt update
sudo apt-get install postgresql
sudo systemctl status postgresql
sudo -u postgres psql
```

#### Dump

```bash
pg_dump mydb > db.sql
```

#### Import

```shell
pg_dump -t mytable mydb > table.sql
```

### [MySQL](https://www.mysql.com)

#### Install

##### macOS

```shell
brew install mysql
brew services start mysql  # 启动服务
brew services stop mysql   # 停止服务
```

##### Ubuntu

```shell
sudo apt update
sudo apt-get install mysql-server
sudo systemctl start mysql
```

#### Dump

```bash
mysqldump -d <database> -u<user_name> -h <host> -p > backup.sql
```

#### Import

```shell
mysql -u <user_name> -h <host> -D <database> -p < backup.sql
```