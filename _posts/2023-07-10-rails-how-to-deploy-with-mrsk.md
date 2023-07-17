---
layout: application
title: 使用 Mrsk 快速部署一个 Rails 服务
categories: rails
date: 2023-07-10
---
## 如何使用 Mrsk 快速部署一个 Rails 服务

### 依赖环境

> docker: 23.0.5

> mrsk: 0.14.0

> ruby: 3.2.1

> rails: 7.0.6

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

- 配置数据库 Secret

> Github -> Project -> Settings -> Actions secrets and variables -> Actions

[配置参考文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

配置的 Secret 记得需要在 `config/deploy.yml` 的 env/secret 中填写

- 配置 Github Deploy Key 用于自动发布

> Github -> Project -> Settings -> Deploy keys

[配置参考文档](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)

- 配置 Github Actions

> [Github Actions 文档](https://docs.github.com/zh/actions/quickstart)

> [阮一峰：GitHub Actions 入门教程](https://www.ruanyifeng.com/blog/2019/09/getting-started-with-github-actions.html)

```shell
mkdir -p .github/workflows && touch .github/workflows/mrsk_deploy.yml
```

根据项目完成 `mrsk_deploy.yml` 的配置，下面是示例

```yml
name: Deploy With Mrsk

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Install SSH Key To Server
        uses: shimataro/ssh-key-action@v2
        with:
          key: ${{ secrets.SSH_PUBLIC_KEY }}
          name: github-actions
          known_hosts: 'random-placeholder-value-replaced-by-keyscan-below'
          config: |
            host abc.host(需要更新为自己的 host)
              IdentityFile ~/.ssh/github-actions
              IdentitiesOnly yes
              ForwardAgent yes

      - name: Install Ruby
        uses: ruby/setup-ruby@v1.138.0
        with:
          ruby-version: "3.2.1"

      - name: Setup Node 18
        uses: actions/setup-node@v1
        with:
          node-version: 18.x

      - name: Install Dependencies
        run: |
          sudo apt install -yqq libpq-dev
          gem install bundler
          bundle install --jobs 4 --retry 3

      - name: Create Env File
        run: |
          touch .env
          echo MRSK_REGISTRY_PASSWORD=${{ secrets.MRSK_REGISTRY_PASSWORD }} >> .env
          echo RAILS_MASTER_KEY=${{ secrets.RAILS_MASTER_KEY }} >> .env
          echo SECRET_KEY_BASE=${{ secrets.SECRET_KEY_BASE }} >> .env
          echo DATABASE_URL=${{ secrets.DATABASE_URL }} >> .env

      - name: Deploy To Production
        run: |
          eval "$(ssh-agent -s)"
          ssh-add ~/.ssh/github-actions
          bundle exec mrsk version
          bundle exec mrsk lock release
          bundle exec mrsk deploy
          bundle exec mrsk prune all
```

- 配置 Mrsk 参考

```yml
service: pages

image: pages/rails

labels:
  traefik.enable: true
  traefik.http.routers.hinong.rule: Host(`pages.abc.your.domain`)
  traefik.http.routers.hinong_secure.entrypoints: websecure
  traefik.http.routers.hinong_secure.rule: Host(`pages.abc.your.domain`)
  traefik.http.routers.hinong_secure.tls: true
  traefik.http.routers.hinong_secure.tls.certresolver: letsencrypt

servers:
  web:
    traefik: true
    hosts:
      - ip host

registry:
  server: pages.abc.your.docker.server.com
  username: wen.sprint@gmail.com
  password:
    - MRSK_REGISTRY_PASSWORD

env:
  clear:
    RAILS_ENV: production 
    RAILS_LOG_TO_STDOUT: 1
  secret:
    - RAILS_MASTER_KEY
    - DATABASE_URL

ssh:
  user: root

builder:
  multiarch: false
  dockerfile: Your Dockerfile path

traefik:
  options:
    publish:
      - "443:443"
    volume:
      - "/letsencrypt/acme.json:/letsencrypt/acme.json"
  args:
    accesslog: true
    accesslog.format: json
    providers.docker: true
    api.dashboard: true
    entryPoints.web.address: ":80"
    entryPoints.websecure.address: ":443"
    certificatesResolvers.letsencrypt.acme.email: "wen.sprint@gmail.com"
    certificatesResolvers.letsencrypt.acme.storage: "/letsencrypt/acme.json"
    certificatesResolvers.letsencrypt.acme.httpchallenge: true
    certificatesResolvers.letsencrypt.acme.httpchallenge.entrypoint: web

healthcheck:
  path: /up
  port: 3000
  interval: 30s
  max_attempts: 30
```

### 问题及解决

- 使用 Traefik 配置 HTTPS 无效

需要在服务器上手动创建 `acme.json` 并且授予正确的文件权限

```shell
mkdir -p /letsencrypt && touch /letsencrypt/acme.json && chmod 600 /letsencrypt/acme.json
```

- 其他项目启动的问题，deploy 之后可以尝试使用 Docker 命令查看并一一修复

```shell
docker container ls -a
```

```shell
docker logs -f <container-id>
```

### 已有项目如何配合使用？以 Nginx 为例

使用 Mrsk 将项目部署到服务器并使用一个未占用的端口，然后修改 Nginx 配置指向该服务端口即可
