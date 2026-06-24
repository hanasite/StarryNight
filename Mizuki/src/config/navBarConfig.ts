import type { NavBarConfig } from "../types/config";
import { LinkPreset } from "../types/config";

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,

		// 动态内容（Memos 驱动）
		{
			name: "Blog",
			url: "/blog/",
			icon: "material-symbols:article",
		},
		{
			name: "Ticker",
			url: "/ticker/",
			icon: "material-symbols:chat",
		},
		{
			name: "TODO",
			url: "/todo/",
			icon: "material-symbols:checklist",
		},
		{
			name: "Timeline",
			url: "/timeline/",
			icon: "material-symbols:timeline",
		},

		{
			name: "Gallery",
			url: "/gallery/",
			icon: "material-symbols:photo-library",
		},
		{
			name: "留言板",
			url: "/guestbook/",
			icon: "material-symbols:forum",
		},
		{
			name: "About",
			url: "/about/",
			icon: "material-symbols:info",
		},
	],
};
