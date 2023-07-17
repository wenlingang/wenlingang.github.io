---
layout: application
title: 如何在 Ubuntu 上升级 Docker
categories: docker
date: 2023-07-10
---
## 如何在 Ubuntu 上升级 Docker

- 检查当前版本

```shell
docker --version
```

- 移除当前已经安装的 Docker

```shell
sudo apt remove docker docker-engine docker.io
```

- 验证是否已经移除

> 如果提示没有该命令，则代表已经移除

```shell
docker --version
```

- 安装依赖

```shell
sudo apt install apt-transport-https ca-certificates curl software-properties-common
```

- 添加 Docker GPG Key

```shell
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
```

- 添加 Ubuntu Repository

```shell
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
```

- 更新 Ubuntu 包索引

```shell
sudo apt update
```

- 安装 Docker CE 

```shell
sudo apt install docker-ce
```

- 验证是否安装成功

```shell
docker --version
```
