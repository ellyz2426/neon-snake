import {
	createSystem,
	PanelUI,
	PanelDocument,
	UIKitDocument,
	UIKit,
	eq,
} from '@iwsdk/core';
import type { Entity } from '@iwsdk/core';
import type { GameManager } from './game';
import { GameState, GameMode, Difficulty } from './types';
import type { Achievement } from './achievements';

// Helper to safely get doc and set text
function setText(doc: UIKitDocument | undefined, id: string, text: string) {
	if (!doc) return;
	const el = doc.getElementById(id) as UIKit.Text | undefined;
	el?.setProperties({ text });
}

function setVisible(doc: UIKitDocument | undefined, id: string, visible: boolean) {
	if (!doc) return;
	const el = doc.getElementById(id) as UIKit.Container | undefined;
	el?.setProperties({ display: visible ? 'flex' : 'none' });
}

export class UISystem extends createSystem({
	hud: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/hud.json')],
	},
	menu: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/menu.json')],
	},
	gameover: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/gover.json')],
	},
	pause: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/pause.json')],
	},
	achv: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/trophies.json')],
	},
	toast: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/toast.json')],
	},
	stats: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/stats.json')],
	},
}) {
	private game!: GameManager;
	private hudDoc: UIKitDocument | null = null;
	private menuDoc: UIKitDocument | null = null;
	private gameoverDoc: UIKitDocument | null = null;
	private pauseDoc: UIKitDocument | null = null;
	private achvDoc: UIKitDocument | null = null;
	private toastDoc: UIKitDocument | null = null;
	private statsDoc: UIKitDocument | null = null;

	// Panel entities for show/hide
	private hudEntity: Entity | null = null;
	private menuEntity: Entity | null = null;
	private gameoverEntity: Entity | null = null;
	private pauseEntity: Entity | null = null;
	private achvEntity: Entity | null = null;
	private toastEntity: Entity | null = null;
	private statsEntity: Entity | null = null;

	private selectedMode: GameMode = GameMode.Classic;
	private selectedDifficulty: Difficulty = Difficulty.Normal;
	private showingAchievements = false;
	private showingStats = false;
	private achvPage = 0;
	private toastTimer = 0;
	private toastQueue: { title: string; desc: string }[] = [];

	setRefs(refs: { game: GameManager }) {
		this.game = refs.game;
		this.game.onAchievement = (title: string, desc: string) => {
			this.toastQueue.push({ title, desc });
		};
	}

	init() {
		this.queries.hud.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.hudDoc = doc;
			this.hudEntity = entity;
		});

		this.queries.menu.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.menuDoc = doc;
			this.menuEntity = entity;
			this.wireMenu(doc);
		});

		this.queries.gameover.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.gameoverDoc = doc;
			this.gameoverEntity = entity;
			this.wireGameOver(doc);
		});

		this.queries.pause.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.pauseDoc = doc;
			this.pauseEntity = entity;
			this.wirePause(doc);
		});

		this.queries.achv.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.achvDoc = doc;
			this.achvEntity = entity;
			this.wireAchievements(doc);
		});

		this.queries.toast.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.toastDoc = doc;
			this.toastEntity = entity;
		});

		this.queries.stats.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.statsDoc = doc;
			this.statsEntity = entity;
			this.wireStats(doc);
		});

		// Wire achievement callback
		this.game?.onAchievement && undefined; // placeholder - set in setRefs
	}

	private wireMenu(doc: UIKitDocument) {
		const btnStart = doc.getElementById('btn-start') as UIKit.Text | undefined;
		btnStart?.addEventListener('click', () => {
			this.game.setMode(this.selectedMode);
			this.game.setDifficulty(this.selectedDifficulty);
			this.game.startGame();
		});

		// Achievements button
		const btnAchv = doc.getElementById('btn-achievements') as UIKit.Text | undefined;
		btnAchv?.addEventListener('click', () => {
			this.showingAchievements = true;
			this.showingStats = false;
			this.achvPage = 0;
			this.updateAchievementsList();
		});

		// Stats button
		const btnStats = doc.getElementById('btn-stats') as UIKit.Text | undefined;
		btnStats?.addEventListener('click', () => {
			this.showingStats = true;
			this.showingAchievements = false;
			this.updateStatsPanel();
		});

		// Mode buttons
		const btnClassic = doc.getElementById('btn-classic') as UIKit.Text | undefined;
		const btnSpeed = doc.getElementById('btn-speed') as UIKit.Text | undefined;
		const btnMaze = doc.getElementById('btn-maze') as UIKit.Text | undefined;

		btnClassic?.addEventListener('click', () => {
			this.selectedMode = GameMode.Classic;
			this.updateModeButtons();
		});
		btnSpeed?.addEventListener('click', () => {
			this.selectedMode = GameMode.Speed;
			this.updateModeButtons();
		});
		btnMaze?.addEventListener('click', () => {
			this.selectedMode = GameMode.Maze;
			this.updateModeButtons();
		});

		// Difficulty buttons
		const btnEasy = doc.getElementById('btn-easy') as UIKit.Text | undefined;
		const btnNormal = doc.getElementById('btn-normal') as UIKit.Text | undefined;
		const btnHard = doc.getElementById('btn-hard') as UIKit.Text | undefined;

		btnEasy?.addEventListener('click', () => {
			this.selectedDifficulty = Difficulty.Easy;
			this.updateDiffButtons();
		});
		btnNormal?.addEventListener('click', () => {
			this.selectedDifficulty = Difficulty.Normal;
			this.updateDiffButtons();
		});
		btnHard?.addEventListener('click', () => {
			this.selectedDifficulty = Difficulty.Hard;
			this.updateDiffButtons();
		});

		this.updateModeButtons();
		this.updateDiffButtons();
	}

	private wireGameOver(doc: UIKitDocument) {
		const btnRetry = doc.getElementById('btn-retry') as UIKit.Text | undefined;
		btnRetry?.addEventListener('click', () => {
			this.game.startGame();
		});

		const btnMenu = doc.getElementById('btn-menu-return') as UIKit.Text | undefined;
		btnMenu?.addEventListener('click', () => {
			this.game.returnToMenu();
		});
	}

	private wirePause(doc: UIKitDocument) {
		const btnResume = doc.getElementById('btn-resume') as UIKit.Text | undefined;
		btnResume?.addEventListener('click', () => {
			this.game.resume();
		});

		const btnQuit = doc.getElementById('btn-quit') as UIKit.Text | undefined;
		btnQuit?.addEventListener('click', () => {
			this.game.returnToMenu();
		});
	}

	private wireStats(doc: UIKitDocument) {
		const btnClose = doc.getElementById('btn-stats-close') as UIKit.Text | undefined;
		btnClose?.addEventListener('click', () => {
			this.showingStats = false;
		});
	}

	private updateStatsPanel() {
		if (!this.statsDoc) return;
		const s = this.game.statsTracker.getStats();
		setText(this.statsDoc, 'stat-longest', String(s.longestSnake));
		setText(this.statsDoc, 'stat-survival', `${Math.floor(s.longestSurvival)}s`);
		setText(this.statsDoc, 'stat-distance', String(s.totalDistance));
		setText(this.statsDoc, 'stat-turns', String(s.totalTurns));
		setText(this.statsDoc, 'stat-classic', String(s.classicBest));
		setText(this.statsDoc, 'stat-speed', String(s.speedBest));
		setText(this.statsDoc, 'stat-maze', String(s.mazeBest));
	}

	private wireAchievements(doc: UIKitDocument) {
		const btnClose = doc.getElementById('btn-achv-close') as UIKit.Text | undefined;
		btnClose?.addEventListener('click', () => {
			this.showingAchievements = false;
		});

		const btnPrev = doc.getElementById('btn-achv-prev') as UIKit.Text | undefined;
		btnPrev?.addEventListener('click', () => {
			if (this.achvPage > 0) {
				this.achvPage--;
				this.updateAchievementsList();
			}
		});

		const btnNext = doc.getElementById('btn-achv-next') as UIKit.Text | undefined;
		btnNext?.addEventListener('click', () => {
			const total = this.game.achievements.getTotalCount();
			const maxPage = Math.ceil(total / 10) - 1;
			if (this.achvPage < maxPage) {
				this.achvPage++;
				this.updateAchievementsList();
			}
		});
	}

	private updateAchievementsList() {
		if (!this.achvDoc) return;
		const all = this.game.achievements.getAll();
		const perPage = 10;
		const startIdx = this.achvPage * perPage;
		const pageItems = all.slice(startIdx, startIdx + perPage);
		const totalPages = Math.ceil(all.length / perPage);

		setText(this.achvDoc, 'achv-count', `${this.game.achievements.getUnlockedCount()} / ${all.length} Unlocked`);
		setText(this.achvDoc, 'achv-page', `Page ${this.achvPage + 1}/${totalPages}`);

		for (let i = 0; i < perPage; i++) {
			const rowEl = this.achvDoc.getElementById(`achv-row-${i}`) as UIKit.Container | undefined;
			if (!rowEl) continue;

			if (i < pageItems.length) {
				const ach = pageItems[i];
				rowEl.setProperties({ display: 'flex' });

				const iconEl = this.achvDoc.getElementById(`achv-icon-${i}`) as UIKit.Text | undefined;
				const titleEl = this.achvDoc.getElementById(`achv-title-${i}`) as UIKit.Text | undefined;
				const descEl = this.achvDoc.getElementById(`achv-desc-${i}`) as UIKit.Text | undefined;

				if (ach.unlocked) {
					iconEl?.setProperties({ text: ach.icon, color: '#ffaa00' });
					titleEl?.setProperties({ text: ach.title, color: '#ffffff' });
					descEl?.setProperties({ text: ach.description, color: '#aaaacc' });
					rowEl.setProperties({ backgroundColor: '#1a1a44' });
				} else {
					iconEl?.setProperties({ text: '?', color: '#444466' });
					titleEl?.setProperties({ text: ach.title, color: '#666688' });
					descEl?.setProperties({ text: ach.description, color: '#444466' });
					rowEl.setProperties({ backgroundColor: '#111133' });
				}
			} else {
				rowEl.setProperties({ display: 'none' });
			}
		}
	}

	private updateModeButtons() {
		if (!this.menuDoc) return;
		const modes = [
			{ id: 'btn-classic', mode: GameMode.Classic },
			{ id: 'btn-speed', mode: GameMode.Speed },
			{ id: 'btn-maze', mode: GameMode.Maze },
		];
		for (const { id, mode } of modes) {
			const btn = this.menuDoc.getElementById(id) as UIKit.Text | undefined;
			if (btn) {
				const active = mode === this.selectedMode;
				btn.setProperties({
					backgroundColor: active ? '#00ff88' : '#222244',
					color: active ? '#000000' : '#aaaacc',
				});
			}
		}
	}

	private updateDiffButtons() {
		if (!this.menuDoc) return;
		const diffs = [
			{ id: 'btn-easy', diff: Difficulty.Easy },
			{ id: 'btn-normal', diff: Difficulty.Normal },
			{ id: 'btn-hard', diff: Difficulty.Hard },
		];
		for (const { id, diff } of diffs) {
			const btn = this.menuDoc.getElementById(id) as UIKit.Text | undefined;
			if (btn) {
				const active = diff === this.selectedDifficulty;
				btn.setProperties({
					backgroundColor: active ? '#00ccff' : '#222244',
					color: active ? '#000000' : '#aaaacc',
				});
			}
		}
	}

	update(delta: number, _time: number) {
		if (!this.game) return;
		const state = this.game.getState();

		// Update panel visibility
		const showMenu = state === GameState.Menu && !this.showingAchievements && !this.showingStats;
		this.setPanelVisible(this.hudEntity, state === GameState.Playing);
		this.setPanelVisible(this.menuEntity, showMenu);
		this.setPanelVisible(this.gameoverEntity, state === GameState.GameOver);
		this.setPanelVisible(this.pauseEntity, state === GameState.Paused);
		this.setPanelVisible(this.achvEntity, this.showingAchievements && state === GameState.Menu);
		this.setPanelVisible(this.statsEntity, this.showingStats && state === GameState.Menu);

		// Toast handling
		if (this.toastTimer > 0) {
			this.toastTimer -= delta;
			if (this.toastTimer <= 0) {
				this.setPanelVisible(this.toastEntity, false);
				// Show next toast if queued
				if (this.toastQueue.length > 0) {
					this.showNextToast();
				}
			}
		} else if (this.toastQueue.length > 0) {
			this.showNextToast();
		}

		// Update HUD
		if (state === GameState.Playing && this.hudDoc) {
			setText(this.hudDoc, 'score-val', String(this.game.getScore()));
			setText(this.hudDoc, 'length-val', String(this.game.getSnakeLength()));
			setText(this.hudDoc, 'high-val', String(this.game.getHighScore()));
		}

		// Update game over panel
		if (state === GameState.GameOver && this.gameoverDoc) {
			setText(this.gameoverDoc, 'final-score', String(this.game.getScore()));
			setText(this.gameoverDoc, 'final-length', String(this.game.getSnakeLength()));
			setText(this.gameoverDoc, 'final-high', String(this.game.getHighScore()));
		}

		// Update menu high score
		if (state === GameState.Menu && this.menuDoc) {
			setText(this.menuDoc, 'menu-high-score', `Best: ${this.game.getHighScore()}`);
		}
	}

	private showNextToast() {
		const item = this.toastQueue.shift();
		if (!item || !this.toastDoc) return;
		setText(this.toastDoc, 'toast-title', item.title);
		setText(this.toastDoc, 'toast-desc', item.desc);
		this.setPanelVisible(this.toastEntity, true);
		this.toastTimer = 3.0;
	}

	private setPanelVisible(entity: Entity | null, visible: boolean) {
		if (!entity || !entity.object3D) return;
		entity.object3D.visible = visible;
	}
}
