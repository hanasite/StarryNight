import type { TimelineItem } from "../components/features/timeline/types";

// 个人历程 — 替换为你自己的经历
export const timelineData: TimelineItem[] = [
	{
		id: "open-source",
		title: "开源决定！",
		description: "把自建站项目开源到 GitHub。Mizuki 的漂亮皮囊 + Memos 的灵动心脏，缝合怪也要堂堂正正晒太阳！开源万岁！",
		type: "achievement",
		startDate: "2026-06-24",
		links: [
			{ name: "GitHub", url: "https://github.com/hanasite", type: "website" },
		],
		icon: "material-symbols:heart-plus",
		color: "#E91E63",
		featured: true,
	},
	{
		id: "nas-blog",
		title: "NAS 自建站搭建",
		description: "在飞牛OS上用 Docker 搭建个人站点，Mizuki + Memos 架构，支持 AI Agent 推送。",
		type: "project",
		startDate: "2026-06-01",
		skills: ["Docker", "Astro", "Memos", "Nginx"],
		achievements: [
			"Mizuki 主题改造为动态 Memos 前端",
			"支持 ticker/blog/todo 实时更新",
			"AI Agent MCP 推送集成",
		],
		icon: "material-symbols:code",
		color: "#7C3AED",
		featured: true,
	},
];
