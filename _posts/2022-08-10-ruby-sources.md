---
layout: application
title: Ruby Sources
categories: ruby
date: 2022-08-10
---
### Ruby Sources

在安装 Ruby 或者平时使用 Rails 的过程经常遇到卡顿的问题，可以使用替换源代替

### Gem Source

- 查看当前源并确定只绑定一个稳定源即可

```bash
gem sources -l
```

- 清华大学源

```bash
gem sources --add https://mirrors.tuna.tsinghua.edu.cn/rubygems/ --remove https://rubygems.org/
```

- Ruby China

```bash
gem sources --add https://gems.ruby-china.com/ --remove https://rubygems.org/
```

- 阿里云

```bash
gem sources --add https://mirrors.aliyun.com/rubygems/ --remove https://rubygems.org/
```

- 腾讯云

```bash
gem sources --add https://mirrors.cloud.tencent.com/rubygems/ --remove https://rubygems.org/
```

- 中国科学技术大学

```bash
gem sources --add https://mirrors.ustc.edu.cn/rubygems/ --remove https://rubygems.org/
```

- RubyGems 官方源

```bash
gem sources --add https://rubygems.org/ --remove https://mirrors.tuna.tsinghua.edu.cn/rubygems/
```

### Bunlder

- 清华大学源

```bash
bundle config mirror.https://rubygems.org https://mirrors.tuna.tsinghua.edu.cn/rubygems
```

- Ruby China

```bash
bundle config mirror.https://rubygems.org https://gems.ruby-china.com
```

- 阿里云

```bash
bundle config mirror.https://rubygems.org https://mirrors.aliyun.com/rubygems/
```

- 腾讯云

```bash
bundle config mirror.https://rubygems.org https://mirrors.cloud.tencent.com/rubygems/
```

- 中国科学技术大学

```bash
bundle config mirror.https://rubygems.org https://mirrors.ustc.edu.cn/rubygems/
```

- RubyGems 官方源

```bash
bundle config mirror.https://rubygems.org https://rubygems.org/
```
