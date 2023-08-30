---
layout: application
title: Rails Sidekiq 事务性推送 Transactional Push
categories: rails
date: 2023-08-30
---

### Rails Sidekiq 事务性推送 Transactional Push

### 使用场景

- 与数据库关联依赖

假设当我们创建一个用户之后，需要用到一个叫做 `GenerateAvatarWorker` 的 Sidekiq 任务来生成用户头像

```ruby
class User < ApplicationController
  def create
    user = User.create(name: params[:name])
    GenerateAvatarWork.perform_async(user.id)
  end
end

class GenerateAvatarWorker
  include Sidekiq::Worker

  def perform(user_id)
    user = User.find(user_id)
    user.generate_avatar!
  end
end
```

这个示例中，会先执行 `User.create` 方法，然后执行 `GenerateAvatarWorker.perform_async` 将任务推送到 Sidekiq 任务队列中，但是如果在执行 `User.create` 方法时，发生了异常失败了或者数据库的 commit 落后了，那么在 `GenerateAvatarWorker` 中就会收到用户查询失败的异常。

同理，如果我们有一个更新用户的环节，当更新用户之后会在 Worker 中给用户发送一个邮件，这时候，如果数据库的 commit 也落后了，那么在 Worker 中可能就会拿到该用户更新前的邮箱作为推送目标。

- 与事务的关联

假设当我们创建一个用户之后，会给该用户配置初始化的角色和权限以及初始化密码，并通过 `PasswordResetWorker` 来发送一个邮件给该用户，这里涉及到了多表写入，我们会用事务的方式来处理

```ruby
class User < ApplicationController
  def create
    ActiveRecord::Base.transaction do
      user = User.create!(name: params[:name], password: "123456")
      user_role = UserRole.create!(user_id: user.id, role_id: 1)
      user_permission = UserPermission.create!(user_id: user.id, permission_id: 1)
      PasswordResetWorker.perform_async(user.id)
    end
  end
end

class PasswordResetWorker
  include Sidekiq::Worker

  def perform(user_id)
    user = User.find(user_id)
    user.send_password_reset_email
  end
end
```

这个示例中，使用事务可以保证当发生错误时：用户、角色分配和权限分配的数据库一致性，但是尽管 `PasswordResetWorker` 也在事务中他仍然会执行，最终还是达不到一致性的效果

- Sidekiq Api

如果是未执行的 Worker 我们仍然可以通过 Sidekiq Api 去操作删除保证不再执行，但可能还是有些繁琐，且仅限未执行的任务

```ruby
schedules = Sidekiq::ScheduledSet.new
job = schedules.find { |j| j if j.klass == 'PasswordResetWorker' && j.item['args'] == [user.id] }
job.delete if job.present? && Time.at(job.score) > Time.now
```

### 解决方案：Use `Sidekiq.transactional_push!` in your sidekiq.rb initializer

[Delay job push within DB transaction](https://github.com/sidekiq/sidekiq/issues/5239)

[Add transaction-aware client](https://github.com/sidekiq/sidekiq/pull/5291/files)

- 该功能是依赖 gem `after_commit_everywhere` 来实现的

```shell
bundle add after_commit_everywhere
```

- 如果是老的项目，需要升级一下 sidekiq 或扩展版本

```
bundle update sidekiq sidekiq-cron
```

- 在 sidekiq.rb 或其他配置文件开启该功能

```ruby
# config/initializers/sidekiq.rb

Sidekiq.transactional_push!
```
