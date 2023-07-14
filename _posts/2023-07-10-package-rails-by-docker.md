---
layout: application
title: 使用 Docker 优化打包 Rails
categories: rails
date: 2020-07-10
---
## 使用 Docker 优化打包 Rails

### 依赖环境

> ruby: 3.2.1

> rails: 7.0.6

> node: 18

> webpack: 5.4

> tailwindcss 3

> docker: 23.0.5

### 目标

通过对打包过程的了解和优化，得到一个体积合适且可用的 Rails 镜像

PS: 想直接看结果的直接跳到最后即可

### 新建测试项目 myapp

```shell
rails new myapp -d postgresql --css tailwind

bundle add webpacker

bundle install

rails webpacker:install

rails tailwindcss:install

rails db:create

rails s
```

### 使用 ruby:3.2.1 构建

> 确保上方执行完成项目可访问

将下方代码复制并放在项目根目录（任意目录都可）的 `Dockerfile`

```dockerfile
FROM ruby:3.2.1

RUN mv /etc/apt/sources.list /etc/apt/sources.list.bak && \
    echo "deb https://mirrors.aliyun.com/debian/ bullseye main non-free contrib" >/etc/apt/sources.list && \
    echo "deb-src https://mirrors.aliyun.com/debian/ bullseye main non-free contrib" >>/etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian-security/ bullseye-security main" >>/etc/apt/sources.list && \
    echo "deb-src https://mirrors.aliyun.com/debian-security/ bullseye-security main" >>/etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian/ bullseye-updates main non-free contrib" >>/etc/apt/sources.list && \
    echo "deb-src https://mirrors.aliyun.com/debian/ bullseye-updates main non-free contrib" >>/etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian/ bullseye-backports main non-free contrib" >>/etc/apt/sources.list && \
    echo "deb-src https://mirrors.aliyun.com/debian/ bullseye-backports main non-free contrib" >>/etc/apt/sources.list

RUN apt-get update && apt-get install -y \
  curl -sL https://deb.nodesource.com/setup_18.x |  bash - && \
  curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
  apt-get update && apt-get install -y nodejs yarn postgresql-client net-tools

WORKDIR /app

ENV RAILS_ENV=production

ENV NODE_ENV=production

COPY Gemfile* package.json yarn.lock ./

RUN bundle install --verbose --jobs 20 --retry 5
RUN yarn --ignore-engines

COPY . .

RUN bin/rails assets:precompile

EXPOSE 3000

CMD ["rails", "server", "-b", "0.0.0.0"]
```

执行打包命令

```shell
# 如果 Dockerfile 在根目录
docker build . -t myapp

# 如果 Dockerfile 在其他目录
docker build . -f <Dockerfile Path> -t myapp
```

我们最终得到的 docker 镜像大小如下：

```bash
REPOSITORY   TAG     SIZE
myapp        latest  1.39GB
```

可以看到还没有任何业务代码的新项目打包都这么大，这是不可接受的，因为是用的 ruby:3.2.1 作为基础镜像的，我们看一下他的镜像大小

```shell
docker pull ruby:3.2.1
```

```bash
REPOSITORY   TAG     SIZE
ruby         3.2.1   844MB
```

看来我们需要寻找到一个可以替代并且体积更小的镜像，通过 [ruby 官方镜像](https://hub.docker.com/_/ruby/tags?page=1&name=3.2.1) 能看到官方提供了 Alpine 镜像

```shell
docker pull ruby:3.2.1-alpine
```

```bash
REPOSITORY   TAG            SIZE
ruby         3.2.1-alpine   79.9MB
```

竟然少了 764MB!

### 使用 ruby:3.2.1-alpine 构建

> https://www.alpinelinux.org/

使用 Alpine 镜像作为基础镜像可能有点复杂，需要手动运行一些命令并安装一些依赖包

```dockerfile
FROM ruby:3.2.1-alpine

RUN apk update \
    && apk upgrade \
    && apk add --update --no-cache \
    build-base curl-dev git libc6-compat postgresql-dev \
    yaml-dev zlib-dev nodejs yarn tzdata

WORKDIR /app

ENV RAILS_ENV=production

ENV NODE_ENV=production

COPY Gemfile* package.json yarn.lock ./

RUN bundle install --verbose --jobs 20 --retry 5
RUN yarn --ignore-engines

COPY . .

RUN NODE_OPTIONS=--openssl-legacy-provider RAILS_ENV=production bundle exec rails assets:precompile

EXPOSE 3000

CMD ["rails", "server", "-b", "0.0.0.0"]
```

执行打包命令，我们得到的镜像大小如下：

```bash
REPOSITORY          TAG     SIZE
myapp-alpine        latest  1.16GB
```

对比 `ruby:3.2.1` 和 `ruby:3.2.1-alpine` 的结果看是小了一些，但作为实际生产用仍然太大，我们还可以继续优化 docker 打包流程

```base
REPOSITORY          TAG       SIZE
myapp-alpine        latest    1.16GB
myapp               latest    1.39GB
```

### 通过多步骤构建 docker 减少构建层数

> https://docs.docker.com/build/building/multi-stage/

> 就像 Git 仓库一样，随着提交/更改的 commits 数量增加项目体积会越来越大，同样 docker 镜像的大小也取决于构建层数，我们可以通过减少 RUN 和 COPY 语句的数量，或者通过类似于 `git squash` 的多步构建来减少层数

```dockerfile
# 构建基础包
FROM ruby:3.2.1-alpine AS build-env

ARG RAILS_ROOT=/app
ARG BUILD_PACKAGES="build-base curl-dev git libc6-compat"
ARG DEV_PACKAGES="postgresql-dev yaml-dev zlib-dev nodejs yarn"
ARG RUBY_PACKAGES="tzdata"

ENV RAILS_ENV=production
ENV NODE_ENV=production
ENV BUNDLE_APP_CONFIG="$RAILS_ROOT/.bundle"

WORKDIR $RAILS_ROOT

RUN apk update \
    && apk upgrade \
    && apk add --update --no-cache $BUILD_PACKAGES $DEV_PACKAGES \
       $RUBY_PACKAGES

COPY Gemfile* package.json yarn.lock ./

RUN bundle config set --local path vendor/bundle \
    && bundle config set --local without 'development:test:assets' \
    && bundle install -j4 --retry 3

RUN yarn install

COPY . .

RUN NODE_OPTIONS=--openssl-legacy-provider RAILS_ENV=production bundle exec rails assets:precompile

############### 引用构建好的基础包 ###############
FROM ruby:2.5.1-alpine

ARG RAILS_ROOT=/app

ARG PACKAGES="tzdata postgresql-client nodejs bash"

ENV RAILS_ENV=production

ENV BUNDLE_APP_CONFIG="$RAILS_ROOT/.bundle"

WORKDIR $RAILS_ROOT

RUN apk update \
    && apk upgrade \
    && apk add --update --no-cache $PACKAGES

COPY --from=build-env $RAILS_ROOT $RAILS_ROOT

EXPOSE 3000

CMD ["rails", "server", "-b", "0.0.0.0"]
```

这里打一个新的包作为对比

```shell
docker build . -t myapp-alpine-v2
```

对比与前者打包结果

```base
REPOSITORY          TAG       SIZE
myapp-alpine-v2     latest    300MB
myapp-alpine        latest    1.16GB
myapp               latest    1.39GB
```

是的，相比较少了将近 4 倍，但我们其实还可以再优化

### 移除不必要的打包文件，即：最终生产使用的 Dockerfile

这里移除的文件都是生产中不需要的，不会影响系统运行的，比如：

- `node_modules`
- `tmp/cache`
- `vendor/assets`
- `test`
- ..

```dockerfile
# 构建基础包
FROM ruby:3.2.1-alpine AS build-env

ARG RAILS_ROOT=/app
ARG BUILD_PACKAGES="build-base curl-dev git libc6-compat"
ARG DEV_PACKAGES="postgresql-dev yaml-dev zlib-dev nodejs yarn"
ARG RUBY_PACKAGES="tzdata"

ENV RAILS_ENV=production
ENV NODE_ENV=production
ENV BUNDLE_APP_CONFIG="$RAILS_ROOT/.bundle"

WORKDIR $RAILS_ROOT

RUN apk update \
    && apk upgrade \
    && apk add --update --no-cache $BUILD_PACKAGES $DEV_PACKAGES \
       $RUBY_PACKAGES

COPY Gemfile* package.json yarn.lock ./

RUN bundle config set --local path vendor/bundle \
    && bundle config set --local without 'development:test:assets' \
    && bundle install -j4 --retry 3 \
    && rm -rf vendor/bundle/ruby/3.2.0/cache/*.gem \
    && find vendor/bundle/ruby/3.2.0/gems/ -name "*.c" -delete \
    && find vendor/bundle/ruby/3.2.0/gems/ -name "*.o" -delete

RUN yarn install

COPY . .

RUN NODE_OPTIONS=--openssl-legacy-provider RAILS_ENV=production bundle exec rails assets:precompile && \
    rm -rf node_modules tmp/cache vendor/assets test

############### 引用构建好的基础包 ###############
FROM ruby:2.5.1-alpine

ARG RAILS_ROOT=/app

ARG PACKAGES="tzdata postgresql-client nodejs bash"

ENV RAILS_ENV=production

ENV BUNDLE_APP_CONFIG="$RAILS_ROOT/.bundle"

WORKDIR $RAILS_ROOT

RUN apk update \
    && apk upgrade \
    && apk add --update --no-cache $PACKAGES

COPY --from=build-env $RAILS_ROOT $RAILS_ROOT

EXPOSE 3000

CMD ["rails", "server", "-b", "0.0.0.0"]
```

这里打一个新的包作为对比

```shell
docker build . -t myapp-alpine-v3
```

对比与前者打包结果

```bash
REPOSITORY          TAG       SIZE
myapp-alpine-v3     latest    174MB
myapp-alpine-v2     latest    300MB
myapp-alpine        latest    1.16GB
myapp               latest    1.39GB
```

最终我们将一个 1.39GB 的镜像缩小到了 174MB 
