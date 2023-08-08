---
layout: application
title: Go 中在没有上下文的场景注入 Trace 信息
categories: go
date: 2023-08-08
---
## Go 中在没有上下文的场景注入 Trace 信息

### Kafka 消费示例

- 在 Golang 中消费 Kafka 消息时，你可以使用 OpenTelemetry 库来注入 trace 信息。OpenTelemetry 是一个用于分布式追踪和度量的开放标准，它提供了一种在应用程序中收集、导出和分析跟踪数据的方式。
- 先创建一个 OpenTelemetry 的 Tracer，然后创建了一个 Kafka 消费者。
- 在消费消息的循环中，使用 tracer.Start 方法创建一个新的 Span，并使用 span.SetAttributes 方法添加了一些与 Kafka 消息相关的 trace 信息。在处理完消息后，使用 span.End 方法结束 Span。

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/segmentio/kafka-go"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
  "go.opentelemetry.io/otel/attribute"
)

func main() {
	// 创建一个 OpenTelemetry 的 Tracer
	tracer := otel.Tracer("kafka-consumer")

	// 创建一个 Kafka 消费者
	consumer, err := kafka.NewConsumer(kafka.ConsumerConfig{
		Brokers: []string{"localhost:9092"},
		GroupID: "my-group",
		Topic:   "my-topic",
	})
	if err != nil {
		log.Fatal(err)
	}

	// 循环消费消息
	for {
		// 从 Kafka 中获取消息
		msg, err := consumer.ReadMessage(context.Background())
		if err != nil {
			log.Println("Error reading message:", err)
			continue
		}

		// 创建一个新的 Span
		ctx, span := tracer.Start(context.Background(), "process-message")
		defer span.End()

		// 在 Span 中添加 trace 信息
		span.SetAttributes(
			attribute.String("kafka.topic", msg.Topic),
			attribute.Int64("kafka.partition", int64(msg.Partition)),
			attribute.Int64("kafka.offset", int64(msg.Offset)),
		)

		// 处理消息
		fmt.Println("Received message:", string(msg.Value))

		// 结束 Span
		span.End()
	}

	// 关闭 Kafka 消费者
	consumer.Close()
}
```

