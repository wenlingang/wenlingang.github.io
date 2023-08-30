---
layout: application
title: PostgreSQL jsonb array object extract
categories: postgresql
date: 2020-04-06
---
### PostgreSQL jsonb array object extract

> https://www.postgresql.org/docs/9.4/functions-json.html

在 rails 开发中，如果使用了 postgreSQL 的 `jsonb` 数据类型，可能会遇到这样的数据场景：有一个表 `table` 有 `jsonb` 类型字段 `data` 中有如下数据：

```json
{
  "a": [1, 2, 3],
  "b": [3, 4, 5],
}
```

如果需要通过 `a` 和 `b` 中的数组中比对取值，那么可以这样：
```ruby
# -> 表示 json 路径
# ->> 表示取出该路径对应的值
# 数组的下标是从 0 开始

Table.where("data -> 'a' ->> 2 = data -> 'b' ->> 2")
```

```sql
select * from table where data -> 'a' ->> 2 = data -> 'b' ->> 2
```
