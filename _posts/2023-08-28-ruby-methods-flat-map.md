---
layout: application
title: Ruby 枚举对象 flat_map
categories: ruby
date: 2023-08-28
---
## Ruby 枚举对象 flat_map

> 返回一个新数组，其中包含对 enum 中的每个元素执行一次 block 操作的结果，如果没有给出 block，则返回一个枚举器。

[Ruby 2.7.0 Enumerable#flat_map](https://ruby-doc.org/core-2.7.0/Enumerable.html#method-i-flat_map)

### 语法

```ruby
flat_map { |obj| block } → array
flat_map → an_enumerator
```

### 示例

> 对一维数组和二维数组使用都能在迭代器中获得每一个元素

```ruby
(1..4).flat_map { |e| [e, -e] } #=> [1, -1, 2, -2, 3, -3, 4, -4]
[[1, 2], [3, 4]].flat_map { |e| e + [100] } #=> [1, 2, 100, 3, 4, 100]
[[1, 2], [3, 4]].flat_map { |e| e } #=> [1, 2, 3, 4]
[1, 2, 3, 4].flat_map { |e| e } #=> [1, 2, 3, 4]
```

- 等同于 `map` 和 `flatten` 的组合：

```ruby
(1..4).map { |e| [e, -e] }.flatten #=> [1, -1, 2, -2, 3, -3, 4, -4]
```

- `flat_map` 与 `map` 的区别在于，`flat_map` 会将块返回的数组展开，而 `map` 不会

```ruby
(1..4).map { |e| [e, -e] } #=> [[1, -1], [2, -2], [3, -3], [4, -4]]
(1..4).flat_map { |e| [e, -e] } #=> [1, -1, 2, -2, 3, -3, 4, -4]
```
