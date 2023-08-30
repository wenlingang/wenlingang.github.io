---
layout: application
title: Go 中 Goroutine 和 Channel 的使用
categories: go
date: 2023-08-16
---
### Go 中 Goroutine 和 Channel 的使用

### Goroutine

> Goroutine 是 Go 语言中的轻量级线程实现，它由 Go 语言的运行时调度完成，而不是由操作系统调度。

- 启动多个 Goroutine 并等待所有都执行结束

```go
package main

import (
	"fmt"
	"sync"
)

var wg sync.WaitGroup

func main() {
	for i := 0; i < 10; i ++ {
		wg.Add(1)

		go hello(i)
	}

	wg.Wait()

	fmt.Println("done")
}

func hello(i int) {
	defer wg.Done()
	fmt.Println("hello", i)
}
```

### Channel

> Channel 是 Go 语言中的管道，类似于 Unix/Linux 中的管道，可以用于 Goroutine 之间的通信。

- 如何写入并读取 Channel

```go
package main

import (
	"fmt"
)

func main() {
	ch1 := make(chan int)
	ch2 := make(chan int)

	// 使用 goroutine 写入 0 - 100 作为 ch1 数据
	go func() {
		for i := 0; i <= 100; i++ {
			ch1 <- i
		}

		close(ch1)
	}()

	// 使用 goroutine 读取 ch1 数据并写入 ch2
	go func() {
		for {
			i, ok := <-ch1
			if !ok {
				break
			}

			ch2 <- i + i
		}

		close(ch2)
	}()

	// 读取 ch2 数据并打印
	// 通道关闭后会自动退出 for 循环
	for i := range ch2 {
		fmt.Println(i)
	}
}
```

- 单向通道 Channel 并使用 channel 当做参数使用

> 单向通道 Channel 只能用于发送或接收数据，不能同时发送和接收数据

> 当参数是 ch1<- int 类型时，只能发送数据，不能接收数据

> 当参数是 <-ch2 int 类型时，只能接收数据，不能发送数据


```go
package main

import (
	"fmt"
)

func counter(wChan chan<- int) {
	for i := 0; i <= 100; i++ {
		wChan <- i
	}

	close(wChan)
}

func reciverCounterAndPlus(wChan chan<- int, rChan <-chan int) {
	for i := range rChan {
		wChan <- i + i
	}

	close(wChan)
}

func printChan(rChan <-chan int) {
	for i := range rChan {
		fmt.Println(i)
	}
}

func main() {
	ch1 := make(chan int)
	ch2 := make(chan int)

	go counter(ch1)
	go reciverCounterAndPlus(ch2, ch1)
	printChan(ch2)
}
```

- 使用 select 语句处理多个 channel

> select 语句用于处理多个 channel，它的语法与 switch 语句类似，但是 select 语句的每个 case 语句必须是一个 channel 操作

> select 语句会一直等待，直到某个 case 语句的 channel 操作完成，然后执行 case 语句

> 如果多个 case 语句的 channel 操作都完成了，select 会随机选择一个执行

> 如果没有 case 语句的 channel 操作完成，select 语句会阻塞，直到有 case 语句的 channel 操作完成

> 如果有 default 语句，select 语句会执行 default 语句，这时 select 语句不会阻塞

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	ch1 := make(chan int)
	ch2 := make(chan int)

	go func() {
		time.Sleep(1 * time.Second)
		ch1 <- 1
	}()

	go func() {
		time.Sleep(2 * time.Second)
		ch2 <- 2
	}()

  select {
	case s1 := <-output1:
		fmt.Println("s1=", s1)
	case s2 := <-output2:
		fmt.Println("s2=", s2)
	}
}
```