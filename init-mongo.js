// 初始化 MongoDB 副本集
rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "127.0.0.1:27017"
    }
  ]
});

// 等待副本集初始化完成
while (rs.status().ok !== 1) {
  sleep(1000);
  print("等待副本集初始化完成...");
}

print("副本集初始化完成!");
