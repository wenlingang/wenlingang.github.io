---
layout: application
title: 使用 Rails 的 ActionController::Live::SSE（服务器发送事件）
categories: rails
date: 2023-08-25
---
## 使用 Rails 的 ActionController::Live::SSE（服务器发送事件）

> 在 Rails 中，ActionController::Live::SSE 是一个用于实现服务器发送事件（Server-Sent Events）的功能的模块。服务器发送事件是一种在客户端和服务器之间实现实时双向通信的技术。

### 服务器发送事件

- 在 Controller 中引入 ActionController::Live

```ruby
class MyController < ApplicationController
	include ActionController::Live
end
```

- 创建一个 SSE 流对象方法

设置了响应的 Content-Type 为'text/event-stream'，这是服务器发送事件的标准 MIME 类型。然后，我们创建了一个 SSE 对象，并将响应的流传递给它。在动作方法中，你可以编写发送事件的逻辑，使用 sse.write 方法发送事件数据。

```ruby
class MyController < ApplicationController
	include ActionController::Live

	def stream
		response.headers['Content-Type'] = 'text/event-stream'
		response.headers['Last-Modified'] = Time.now.httpdate
		sse = SSE.new(response.stream, retry: 300, event: 'event-name')
		
		# 在这里编写发送事件的逻辑
		5.times do |i|
			sse.write({ message: "Hello - #{i}" })
			sse.write({ message: "Hello again - #{i}" })
		end
	rescue ActionController::Live::ClientDisconnected
		sse.close
	ensure
		sse.close
	end
end
```

- 定义 SSE 流的路由

```ruby
get '/stream', to: 'my#stream'
```

- 在客户端使用 SSE 流

使用 EventSource 对象来建立与服务器的连接，并监听'message'事件，这个事件会在服务器发送事件时触发。在事件处理程序中，我们解析了事件数据，并将其打印到控制台。

```javascript
const source = new EventSource('/stream')

source.onopen = (event) {
	console.log('Connection was opened', event)
}

source.onmessage = (event) => {
  console.log("Connection message received:", event)
};

source.onerror = (event) {
	console.error("Connection was failed:", err)
}
```
