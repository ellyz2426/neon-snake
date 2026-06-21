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
import { GameState, GameMode, Difficulty, SnakeSkin, SNAKE_SKIN_DEFS } from './types';

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
	lb: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/lboard.json')],
	},
	settings: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/settings.json')],
	},
	help: {
		required: [PanelUI, PanelDocument],
		where: [eq(PanelUI, 'config', './ui/help.json')],
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
	private lbDoc: UIKitDocument | null = null;
	private settingsDoc: UIKitDocument | null = null;
	private helpDoc: UIKitDocument | null = null;

	private hudEntity: Entity | null = null;
	private menuEntity: Entity | null = null;
	private gameoverEntity: Entity | null = null;
	private pauseEntity: Entity | null = null;
	private achvEntity: Entity | null = null;
	private toastEntity: Entity | null = null;
	private statsEntity: Entity | null = null;
	private lbEntity: Entity | null = null;
	private settingsEntity: Entity | null = null;
	private helpEntity: Entity | null = null;

	private selectedMode: GameMode = GameMode.Classic;
	private selectedDifficulty: Difficulty = Difficulty.Normal;
	private showingAchievements = false;
	private showingStats = false;
	private showingLeaderboard = false;
	private showingSettings = false;
	private showingHelp = false;
	private achvPage = 0;
	private toastTimer = 0;
	private toastQueue: { title: string; desc: string }[] = [];
	private volume = 50;

	setRefs(refs: { game: GameManager }) {
		this.game = refs.game;
		this.game.onAchievement = (title: string, desc: string) => {
			this.toastQueue.push({ title, desc });
		};
		this.game.onPowerUp = (label: string) => {
			this.toastQueue.push({ title: 'POWER UP', desc: label });
		};
		this.game.onLevelUp = (level: number) => {
			this.toastQueue.push({ title: 'LEVEL UP', desc: `Level ${level}` });
		};
		this.game.onCombo = (count: number) => {
			if (count >= 3) {
				this.toastQueue.push({ title: 'COMBO', desc: `${count}x Multiplier!` });
			}
		};
		this.game.onTimerUpdate = (remaining: number) => {
			if (this.hudDoc) {
				const secs = Math.ceil(remaining);
				const color = remaining < 10 ? '#ff2222' : remaining < 20 ? '#ffaa00' : '#ff4444';
				const timerEl = this.hudDoc.getElementById('timer-val') as UIKit.Text | undefined;
				timerEl?.setProperties({ text: String(secs), color });
			}
		};
		this.game.onTimeUp = () => {
			this.toastQueue.push({ title: 'TIME UP', desc: 'Game Over!' });
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

		this.queries.lb.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.lbDoc = doc;
			this.lbEntity = entity;
			this.wireLeaderboard(doc);
		});

		this.queries.settings.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.settingsDoc = doc;
			this.settingsEntity = entity;
			this.wireSettings(doc);
		});

		this.queries.help.subscribe('qualify', (entity) => {
			const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
			if (!doc) return;
			this.helpDoc = doc;
			this.helpEntity = entity;
			this.wireHelp(doc);
		});
	}

	private wireMenu(doc: UIKitDocument) {
		const btnStart = doc.getElementById('btn-start') as UIKit.Text | undefined;
		btnStart?.addEventListener('click', () => {
			this.game.setMode(this.selectedMode);
			this.game.setDifficulty(this.selectedDifficulty);
			this.game.startGame();
		});

		const btnAchv = doc.getElementById('btn-achievements') as UIKit.Text | undefined;
		btnAchv?.addEventListener('click', () => {
			this.showingAchievements = true;
			this.showingStats = false;
			this.showingLeaderboard = false;
			this.showingSettings = false;
			this.showingHelp = false;
			this.achvPage = 0;
			this.updateAchievementsList();
		});

		const btnStats = doc.getElementById('btn-stats') as UIKit.Text | undefined;
		btnStats?.addEventListener('click', () => {
			this.showingStats = true;
			this.showingAchievements = false;
			this.showingLeaderboard = false;
			this.showingSettings = false;
			this.showingHelp = false;
			this.updateStatsPanel();
		});

		const btnLb = doc.getElementById('btn-leaderboard') as UIKit.Text | undefined;
		btnLb?.addEventListener('click', () => {
			this.showingLeaderboard = true;
			this.showingAchievements = false;
			this.showingStats = false;
			this.showingSettings = false;
			this.showingHelp = false;
			this.updateLeaderboard();
		});

		const btnSettings = doc.getElementById('btn-settings') as UIKit.Text | undefined;
		btnSettings?.addEventListener('click', () => {
			this.showingSettings = true;
			this.showingAchievements = false;
			this.showingStats = false;
			this.showingLeaderboard = false;
			this.showingHelp = false;
			this.updateSettingsSkins();
		});

		const btnHelp = doc.getElementById('btn-help') as UIKit.Text | undefined;
		btnHelp?.addEventListener('click', () => {
			this.showingHelp = true;
			this.showingAchievements = false;
			this.showingStats = false;
			this.showingLeaderboard = false;
			this.showingSettings = false;
		});

		// Mode buttons
		const modes: { id: string; mode: GameMode }[] = [
			{ id: 'btn-classic', mode: GameMode.Classic },
			{ id: 'btn-speed', mode: GameMode.Speed },
			{ id: 'btn-maze', mode: GameMode.Maze },
			{ id: 'btn-wrap', mode: GameMode.Wrap },
			{ id: 'btn-daily', mode: GameMode.Daily },
			{ id: 'btn-timeattack', mode: GameMode.TimeAttack },
		];
		for (const { id, mode } of modes) {
			const btn = doc.getElementById(id) as UIKit.Text | undefined;
			btn?.addEventListener('click', () => {
				this.selectedMode = mode;
				this.updateModeButtons();
			});
		}

		// Difficulty buttons
		const diffs: { id: string; diff: Difficulty }[] = [
			{ id: 'btn-easy', diff: Difficulty.Easy },
			{ id: 'btn-normal', diff: Difficulty.Normal },
			{ id: 'btn-hard', diff: Difficulty.Hard },
		];
		for (const { id, diff } of diffs) {
			const btn = doc.getElementById(id) as UIKit.Text | undefined;
			btn?.addEventListener('click', () => {
				this.selectedDifficulty = diff;
				this.updateDiffButtons();
			});
		}

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

	private wireLeaderboard(doc: UIKitDocument) {
		const btnClose = doc.getElementById('btn-lb-close') as UIKit.Text | undefined;
		btnClose?.addEventListener('click', () => {
			this.showingLeaderboard = false;
		});
	}

	private wireSettings(doc: UIKitDocument) {
		const btnClose = doc.getElementById('btn-settings-close') as UIKit.Text | undefined;
		btnClose?.addEventListener('click', () => {
			this.showingSettings = false;
		});

		// Skin buttons
		for (let i = 0; i < SNAKE_SKIN_DEFS.length; i++) {
			const btn = doc.getElementById(`btn-skin-${i}`) as UIKit.Text | undefined;
			btn?.addEventListener('click', () => {
				this.game.setSkin(SNAKE_SKIN_DEFS[i].id);
				this.updateSettingsSkins();
			});
		}

		// Volume buttons
		const btnVolDown = doc.getElementById('btn-vol-down') as UIKit.Text | undefined;
		btnVolDown?.addEventListener('click', () => {
			this.volume = Math.max(0, this.volume - 10);
			this.game.audio.setVolume(this.volume / 100);
			this.updateVolumeDisplay();
		});

		const btnVolUp = doc.getElementById('btn-vol-up') as UIKit.Text | undefined;
		btnVolUp?.addEventListener('click', () => {
			this.volume = Math.min(100, this.volume + 10);
			this.game.audio.setVolume(this.volume / 100);
			this.updateVolumeDisplay();
		});

		const btnMute = doc.getElementById('btn-mute') as UIKit.Text | undefined;
		btnMute?.addEventListener('click', () => {
			const muted = this.game.audio.toggleMute();
			btnMute.setProperties({
				text: muted ? 'Unmute' : 'Mute',
				backgroundColor: muted ? '#ff2266' : '#222244',
			});
		});

		this.updateSettingsSkins();
		this.updateVolumeDisplay();
	}

	private updateSettingsSkins() {
		if (!this.settingsDoc) return;
		const currentSkin = this.game.getSkin();
		const skinColors: Record<string, string> = {
			[SnakeSkin.NeonGreen]: '#00ff88',
			[SnakeSkin.CyberBlue]: '#00aaff',
			[SnakeSkin.FireRed]: '#ff4422',
			[SnakeSkin.GoldRush]: '#ffcc00',
			[SnakeSkin.Ultraviolet]: '#cc44ff',
		};

		for (let i = 0; i < SNAKE_SKIN_DEFS.length; i++) {
			const btn = this.settingsDoc.getElementById(`btn-skin-${i}`) as UIKit.Text | undefined;
			if (!btn) continue;
			const active = SNAKE_SKIN_DEFS[i].id === currentSkin;
			const color = skinColors[SNAKE_SKIN_DEFS[i].id] || '#00ff88';
			btn.setProperties({
				backgroundColor: active ? color : '#222244',
				color: active ? '#000000' : '#aaaacc',
			});
		}
	}

	private updateVolumeDisplay() {
		if (!this.settingsDoc) return;
		setText(this.settingsDoc, 'vol-display', `${this.volume}%`);
	}

	private wireHelp(doc: UIKitDocument) {
		const btnClose = doc.getElementById('btn-help-close') as UIKit.Text | undefined;
		btnClose?.addEventListener('click', () => {
			this.showingHelp = false;
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
		setText(this.statsDoc, 'stat-wrap', String(s.wrapBest));
		setText(this.statsDoc, 'stat-daily', String(s.dailyBest));
		setText(this.statsDoc, 'stat-timed', String(s.timeattackBest));
	}

	private updateLeaderboard() {
		if (!this.lbDoc) return;
		const entries = this.game.leaderboard.getTop(10);

		for (let i = 0; i < 10; i++) {
			const rowEl = this.lbDoc.getElementById(`lb-row-${i}`) as UIKit.Container | undefined;
			if (!rowEl) continue;

			if (i < entries.length) {
				const e = entries[i];
				rowEl.setProperties({ display: 'flex' });
				setText(this.lbDoc, `lb-score-${i}`, String(e.score));
				setText(this.lbDoc, `lb-mode-${i}`, e.mode.charAt(0).toUpperCase() + e.mode.slice(1));
				setText(this.lbDoc, `lb-len-${i}`, `L:${e.length}`);
			} else {
				rowEl.setProperties({ display: 'none' });
			}
		}
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
			{ id: 'btn-wrap', mode: GameMode.Wrap },
			{ id: 'btn-daily', mode: GameMode.Daily },
			{ id: 'btn-timeattack', mode: GameMode.TimeAttack },
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

		const showMenu = state === GameState.Menu && !this.showingAchievements && !this.showingStats && !this.showingLeaderboard && !this.showingSettings && !this.showingHelp;
		this.setPanelVisible(this.hudEntity, state === GameState.Playing);
		this.setPanelVisible(this.menuEntity, showMenu);
		this.setPanelVisible(this.gameoverEntity, state === GameState.GameOver);
		this.setPanelVisible(this.pauseEntity, state === GameState.Paused);
		this.setPanelVisible(this.achvEntity, this.showingAchievements && state === GameState.Menu);
		this.setPanelVisible(this.statsEntity, this.showingStats && state === GameState.Menu);
		this.setPanelVisible(this.lbEntity, this.showingLeaderboard && state === GameState.Menu);
		this.setPanelVisible(this.settingsEntity, this.showingSettings && state === GameState.Menu);
		this.setPanelVisible(this.helpEntity, this.showingHelp && state === GameState.Menu);

		// Toast handling
		if (this.toastTimer > 0) {
			this.toastTimer -= delta;
			if (this.toastTimer <= 0) {
				this.setPanelVisible(this.toastEntity, false);
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
			setText(this.hudDoc, 'level-val', String(this.game.getLevel()));

			// Show timer for Time Attack
			const isTA = this.game.isTimeAttackMode();
			setVisible(this.hudDoc, 'timer-row', isTA);

			// Show status row if there's combo or active power-ups
			const combo = this.game.getComboCount();
			const powerLabels = this.game.getActivePowerUpLabels();
			const hasStatus = combo > 1 || powerLabels.length > 0;
			setVisible(this.hudDoc, 'status-row', hasStatus);

			if (hasStatus) {
				setText(this.hudDoc, 'combo-val', combo > 1 ? `${combo}x COMBO` : '');
				setText(this.hudDoc, 'powerup-val', powerLabels.length > 0 ? powerLabels.join(' ') : '');
			}
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
