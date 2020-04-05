---
layout: application
title: Ajax Can't verify CSRF token authenticity rails
categories: rails
---
## Ajax Can't verify CSRF token authenticity rails

发生此错误是因为发送Ajax请求时，头信息中没有加入rails的csrf-token，导致请求头信息验证失败

1. 确保在layout中加入了下方代码：
    ```erb
    <%= csrf_meta_tag %>
    ```

2. 在Ajax的beforeSend中加入如下代码：
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

3. 如果要全局添加，则：
    ```javascript
    $.ajaxSetup({
      headers: {
        'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content')
      }
    });
    ```
