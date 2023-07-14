---
layout: application
title: 使用 Mrsk 快速部署一个 Rails 服务
categories: rails
date: 2020-07-10
---
## 如何使用 Mrsk 快速部署一个 Rails 服务

### 依赖环境

> docker: 23.0.5

> mrsk: 0.14.0

### 参考链接

> https://github.com/mrsked/mrsk

> https://mrsk.dev/

> https://world.hey.com/dhh/we-have-left-the-cloud-251760fb

> https://37signals.com/podcast/leaving-the-cloud/

### 目标

使用 Mrsk 发布新的服务并使用 Github Actions 自动化发布

### 使用参考

- 如果没有使用过 Ruby 和 Rails 可以参考安装

> [安装 Ruby & Rails](https://wenlingang.github.io/rails/2020/07/10/ruby-install-ways-rvm/) 

- 安装 Mrsk

```shell
gem install mrsk
```

- 在项目中初始化 Mrsk 配置

```shell
mrsk init
```

执行完成后会生成一个 YML 文件 `config/deploy.yml`，仔细阅读文件中的样例会帮助你更容易理解部署相关的内容

- 打包项目

> [使用 Docker 优化打包 Rails](https://wenlingang.github.io/rails/2020/07/10/package-rails-by-docker/) 

- 服务器安装 Docker

> [Ubuntu 上升级安装 Docker](https://wenlingang.github.io/docker/2020/07/10/docker-how-to-upgrade-docker-on-ubuntu/) 

- 配置数据库 Secret & Deploy Key

- 配置 Github SSH 用于自动发布

- 配置 Github Actions

- 配置 Mrsk

- HTTP & HTTPS 配置

- 问题及解决

- 完整 deploy.yml

### 已有项目如何配合使用？已 Nginx 为例

