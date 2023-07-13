---
layout: application
title: 使用 RVM 安装管理 Ruby 版本
categories: ruby
date: 2020-02-23
---


## RVM

> https://rvm.io/

- 安装或导入 gpg key

```shell
gpg2 --keyserver keyserver.ubuntu.com --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 7D2BAF1CF37B13E2069D6956105BD0E739499BDB
```

如遇错误解决：

- keyserver receive failed (on every keyserver available)

```shell
sudo pkill dirmngr; dirmngr --debug-all --daemon --standard-resolver
```

- gpg2 command not found

```shell
# ubuntu
sudo apt install gpg2

# mac
brew install gnupg gnupg2
```

- 安装 RVM

```shell
\curl -sSL https://get.rvm.io | bash -s stable
```

- 换 RVM 源提高 Ruby 安装速度

```shell
echo "ruby_url=https://cache.ruby-china.com/pub/ruby" > /usr/local/rvm/user/db
```

- 换 GEM 源提高 Ruby 安装速度

二选一即可

```shell
# ruby-china
gem sources --add https://gems.ruby-china.com/ --remove https://rubygems.org/

# tsinghua edu
gem sources --add https://mirrors.tuna.tsinghua.edu.cn/rubygems/ --remove https://rubygems.org/
```

如果已经有 Rails 项目，则还需要将 Gemfile 中的 `source "https://rubygems.org"` 替换为上面的源地址，如：`source "https://gems.ruby-china.com/"`

- 安装 Bunlder 并替换默认源

```shell
gem install bunlder
```

```shell
# ruby-china
bundle config mirror.https://rubygems.org https://gems.ruby-china.com

# tsinghua edu
bundle config mirror.https://rubygems.org https://mirrors.tuna.tsinghua.edu.cn/rubygems
```

- 安装稳定版本的 Rails 和 Ruby

```shell
\curl -sSL https://get.rvm.io | bash -s stable --rails
```

- 查看当前安装的 Ruby 版本

```shell
rvm list
```

- 查看当前可安装的 Ruby 版本

```shell
rvm list known
```

- 安装指定版本的 Ruby

```shell
rvm install 3.0.0
```

- 切换到指定版本的 Ruby

```shell
rvm use 3.0.0
```

- 卸载指定版本的 Ruby

```shell
rvm remove 3.0.0
```

- 新建 Rails 项目

```shell
# 初始化项目
rails new myapp --database=postgresql --css=tailwindcss

# 新建数据库
rails db:create

# 启动服务
rails s
```
