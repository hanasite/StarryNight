/**
 * TODO 模板 — 快速创建常用清单
 */
(function (global) {
	"use strict";
	global.TODO_TEMPLATES = [
		{
			name: "通用待办",
			content: "## 待办\n- [ ] 任务一\n- [ ] 任务二\n- [ ] 任务三\n #todo",
		},
		{
			name: "NAS 维护",
			content: "## NAS 维护\n- [ ] 检查磁盘空间\n- [ ] 更新 Docker 镜像\n- [ ] 备份数据库\n- [ ] 查看系统日志\n #todo",
		},
		{
			name: "学习计划",
			content: "## 学习计划\n- [ ] 阅读文档\n- [ ] 动手实践\n- [ ] 整理笔记\n- [ ] 输出博客\n #todo",
		},
		{
			name: "周计划",
			content: "## 本周计划\n- [ ] 周一\n- [ ] 周二\n- [ ] 周三\n- [ ] 周四\n- [ ] 周五\n #todo",
		},
	];
})(typeof window !== "undefined" ? window : globalThis);
