---
layout: application
title: Ajax Can't verify CSRF token authenticity rails
categories: rails
date: 2020-04-05
---
### Ajax Can't verify CSRF token authenticity rails

> 在 rails 开发中，经常会遇到需要异步请求的需求，这个时候使用 jQuery 的 Ajax 十分方便，但是在使用过程中，我们有时会遇到：`Can't verify CSRF token authenticity` 发生此错误是因为在 rails 中发送 Ajax 请求时，头信息中没有加入 csrf-token，导致请求头信息验证失败

确保在 layout 中加入了下方代码：
```erb
<%= csrf_meta_tag %>
```

在 Ajax 的 beforeSend 中加入如下代码：
```javascript
$.ajax({ url: 'YOUR URL HERE',
  type: 'POST',
  beforeSend: function(xhr) {xhr.setRequestHeader('X-CSRF-Token', $('meta[name="csrf-token"]').attr('content'))},
  data: 'someData=' + someData,
  success: function(response) {
    $('#someDiv').html(response);
  }
});
```

如果要全局添加，则在全局引用下面代码：
```javascript
$.ajaxSetup({
  headers: {
    'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content')
  }
});
```
