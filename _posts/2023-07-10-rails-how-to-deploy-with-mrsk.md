---
layout: application
title: 使用 Mrsk 快速部署一个 Rails 服务
categories: rails
date: 2020-07-10
---
## 如何使用 Mrsk 快速部署一个 Rails 服务

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

执行完成后会生成一个 YML 文件 `config/deploy.yml`
