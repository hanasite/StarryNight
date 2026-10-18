import {
	REACTIONS,
	ROW_GROUND_OFFSET,
	RUN_FRAME_CENTERS,
} from "./banner-pet-core.js";

export const PET_PROFILES = {
	clawd: {
		id: "clawd",
		name: "Clawd",
		sprite: "/assets/pets/clawd/spritesheet.webp",
		scale: { desktop: 0.6, mobile: 0.45 },
		defaultX: 0.35,
		groundOffsets: ROW_GROUND_OFFSET,
		runCenters: RUN_FRAME_CENTERS,
		reactions: REACTIONS,
	},
	deepseek: {
		id: "deepseek",
		name: "deepseek酱",
		sprite: "/assets/pets/deepseek/spritesheet.webp",
		scale: { desktop: 0.6, mobile: 0.48 },
		defaultX: 0.65,
		groundOffsets: {
			0: 7,
			1: 8,
			2: 8,
			3: 7,
			4: 7,
			5: 8,
			6: 7,
			7: 7,
			8: 7,
		},
		runCenters: null,
		reactions: [
			{ row: "wave", lines: ["干饭！", "今天也吃白饭~", "deepseek酱报到"] },
			{ row: "jump", lines: ["白饭真香！", "蹦一下！", "别戳啦～"] },
			{
				row: "work",
				lines: ["干饭中，勿扰", "再来一碗白饭", "吃饱才有力气跑模型"],
			},
			{
				row: "review",
				lines: ["看看今天的菜单", "碗里还有吗？", "嗯，是白饭的味道"],
			},
		],
	},
};
