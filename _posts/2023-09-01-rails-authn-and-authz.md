---
layout: application
title: Rails 中的身份验证 Authentication 和 Authorization
categories: rails
date: 2023-09-01
---

### Rails 中的身份验证 (Authentication - Authn) 和授权 (Authorization - Authz)

### 什么是 Authn 和 Authz

[Authn 与 Authz 它们有什么不同？](https://www.cloudflare.com/zh-cn/learning/access-management/authn-vs-authz/)

在信息安全中，身份验证（缩写为 authn）和授权（缩写为 authz）是相关但独立的概念。两者都是身份和访问管理 (IAM) 的重要组成部分。

authn 和 authz 有什么不同？简单来说，authn 与身份有关，即某人是谁，而 authz 与权限有关，即某人被允许做什么。

- authn

身份验证意味着确保一个人或设备是他们（它们）声称的人（或东西）。领取活动门票的人可能会被要求出示身份证以验证其身份；同样，应用程序或数据库可能希望通过检查用户的身份来确保用户是合法的。身份验证确保数据不会暴露给错误的人。

- authz

授权决定了经过身份验证的用户可以查看的内容和执行的操作。想想当银行客户在线登录他们的账户时会发生什么。因为他们的身份已经过验证，他们可以看到自己的账户余额和交易历史——但他们无权查看其他人的。相反，银行的经理可以被授权查看任何客户的财务数据。

### 实现用户注册和登录必要的流程 - Authentication

- 注册
- 登录
- 登出
- 记住账号

#### Modal

```ruby
class User < ApplicationRecord
  has_secure_password

  validates :name, :password, presence: true
  validate_uniqueness_of :name
end
```

`has_secure_password(attribute = :password, validations: true)` 是 Rails 内置的安全密码模块，他增加了设置和验证 BCrypt 密码的方法，这种机制要求你有一个 XXX_digest 属性，其中 XXX 是所需密码的属性名。比如我们当前数据库存放密码的字段是 `password` 那就需要数据库有一列是 `password_digest`，然后他会自动做如下的校验：

+ 创建 User 时必须提供密码
+ 密码长度应小于等于 72 字节
+ 确认密码时使用 XXX_digest 属性

使用该属性需要添加 `bundle add gem 'bcrypt'` 到 Gemfile，然后运行 `bundle install`

添加之后可以这样验证用户密码：`user.authenticate('password')`

#### Controller

```ruby
class UsersController < ApplicationController
  def create
    user = User.new(user_params)
    if user.save
      render json: user, status: :ok
    else
      render json: { error: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private
    def user_params
      params.require(:user).permit(:name, :password)
    end
end
```

```ruby
class SessionsController < ApplicationController
  def create
    user = User.find_by(name: params[:name])
    if user && user.authenticate(params[:password])
      if params[:remember_me]
        # 此为示例，如果要使用 cookies 机制应正确存储加密后的结果到客户端，否则会有安全问题
        cookies[:remember_token] = { value: user.id, expires: 24.hour }
      else
        session[:user_id] = user.id
      end

      render json: user, status: :ok
    else
      render json: { error: 'Invalid name or password' }, status: :unauthorized
    end
  end

  def destroy
    session.delete(:user_id)
    render json: { ok: true }, status: :ok
  end
end
```

```ruby
class ApplicationController < ActionController::Base
  before_action :authenticate_user!
  include ActionController::Cookies

  private
    # 定义该函数后，只要继承 ApplicationController 那就都可以用 current_user 来获取当前用户的信息
    def current_user
      @current_user ||= User.find_by_id(session[:user_id])
    end


    def authenticate_user!
      render json: { error: 'Not Authorized' }, status: :unauthorized unless current_user
    end
end
```

我们分别提到了 `session` 和 `cookies` 两个关键的信息，他们都是 Rails 用于在 Web 应用程序中存储和管理数据的机制：

**区别**

+ 存储位置：
  - `session` 是服务端存储机制，将数据存储在服务器上，默认情况下 Rails 使用 Cookie 来存储一个会话标识符（session ID）
  - `cookies` 是客户端存储机制，它将数据存储在用户的浏览器中

+ 安全性：
  - `session`数据存储在服务器上，因此相对较安全。只有会话标识符存储在 Cookie 中，而实际的数据存储在服务器上，客户端无法直接访问和修改数据。
  - `cookies`数据存储在用户的浏览器中，因此相对不太安全。虽然可以对 `cookies` 进行加密和签名以提高安全性，但客户端仍然可以查看和修改 `cookies` 中的数据

+ 存储容量：
  - `session` 可以存储较大量的数据，因为数据存储在服务器上。
  - `cookies`的存储容量有限，通常限制在几 KB 到几十 KB 之间，因为数据存储在浏览器的 Cookie 中。

+ 生命周期：
  - `session` 的生命周期由服务器管理，可以在会话期间保持数据的持久性。默认情况下，`session`在用户关闭浏览器时过期，但可以通过配置来延长其生命周期。
  - `cookies`可以设置过期时间，可以在指定的时间后过期，或者可以设置为会话`cookies`，在用户关闭浏览器时过期。

**使用方式**

+ session

```ruby
# 设置会话
session[:user_id] = 1

# 获取会话
user_id = session[:user_id]

# 删除会话
session.delete(:user_id)
```

+ cookies

```ruby
# 设置 cookie
cookies[:username] = {
  value: 'john',
  expires: 1.week.from_now
}

# 获取 cookie
username = cookies[:username]

# 删除 cookie
cookies.delete(:username)
```

#### Router

```ruby
Rails.application.routes.draw do
  resources :users, only: [:create]
  post '/login', to: 'sessions#create'
  delete '/logout', to: 'sessions#destroy'
end
```

### 实现用户身份验证 - Authorization

用户身份验证如有策略、角色、权限等等根据实际业务需要，能够使用的比如一些 Gem 比如：

- [cancancan](https://github.com/cancancommunity/cancancan)
- [action_policy](https://github.com/palkan/action_policy)
- [rolify](https://github.com/rolifycommunity/rolify)
- [role_core](https://github.com/rails-engine/role_core)
- [consul](https://github.com/makandra/consul)

假设我们现在在做一个 Blog 系统，我们期望只有 Blog 的作者才能管理他自己的文章

#### Modal

```ruby
class User < ApplicationRecord
  has_many :blogs
end

class Blog < ApplicationRecord
  belongs_to :user
end
```

#### Controller

```ruby
class BlogsController < ApplicationController
  before_action :set_blog, only: [:show, :update, :destroy]
  before_action :authorize_author!, only: [:update, :destroy]

  def update
    if @blog.update(blog_params)
      render json: @blog, status: :ok
    else
      render json: { errors: @blog.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @blog.destroy
    render json: { ok: true }, status: :ok
  end

  def show
    render json: @blog, status: :ok
  end

  private
    def set_blog
      @blog = Blog.find(params[:id])
    end

    def blog_params
      params.require(:blog).permit(:title, :body)
    end

    def authorize_user!
      if @blog.user != current_user
        render json: { error: 'Unauthorized' }, status: :unauthorized
      end
    end
end
```

### 总结

上面示例只是简单讲解和实现了 authn 和 authz 的分工，每个系统的访问控制如何设计还需要结合自身情况来决定。

在设计和实现之前，推荐阅读一下这些最佳实践：

- [阿里云 RAM 用户管理](https://help.aliyun.com/zh/ram/user-guide/ram-user-management)
- [阿里云 RAM 用户组管理](https://help.aliyun.com/zh/ram/user-guide/ram-user-group-management)
- [阿里云 RAM 角色管理](https://help.aliyun.com/zh/ram/user-guide/ram-role-management)
- [阿里云权限策略管理](https://help.aliyun.com/zh/ram/user-guide/policy-management)
- [Cloudflare 身份和访问管理](https://www.cloudflare.com/zh-cn/learning/access-management/what-is-identity-and-access-management/)
- [AWS IAM 中的策略和权限](https://docs.aws.amazon.com/zh_cn/IAM/latest/UserGuide/access_policies.html)
- [AWS IAM 中的安全最佳实践](https://docs.aws.amazon.com/zh_cn/IAM/latest/UserGuide/best-practices.html)
- [腾讯云 ABAC 概述](https://cloud.tencent.com/document/product/598/74876)

....持续收集中
