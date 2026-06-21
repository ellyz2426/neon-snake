import {
	World,
	PanelUI,
} from '@iwsdk/core';
import { GameManager } from './game';
import { GameSystem } from './game-system';
import { UISystem } from './ui-system';
import { createArena } from './arena';

async function main(): Promise<void> {
	const container = document.getElementById('app') as HTMLDivElement;

	const world = await World.create(container, {
		xr: { offer: 'once' },
		render: {
			near: 0.01,
			far: 100,
			defaultLighting: false,
		},
		features: {
			grabbing: false,
			locomotion: false,
			physics: false,
		},
	});

	// Set camera to look down at the board
	world.camera.position.set(0, 2.0, 0.3);
	world.camera.lookAt(0, 0.9, -1.2);

	// Create the arena
	const arenaGroup = createArena(world);

	// Create the game manager
	const game = new GameManager(world, arenaGroup);

	// Register systems
	world.registerSystem(GameSystem);
	world.registerSystem(UISystem);

	const gameSystem = world.getSystem(GameSystem)!;
	gameSystem.setRefs({ game });

	const uiSystem = world.getSystem(UISystem)!;
	uiSystem.setRefs({ game });

	// Create UI panels
	createPanels(world);
}

function createPanels(world: World): void {
	// HUD - positioned above the board
	const hudEntity = world.createTransformEntity();
	hudEntity.object3D!.position.set(0, 1.65, -1.0);
	hudEntity.addComponent(PanelUI, { config: './ui/hud.json', maxWidth: 500, maxHeight: 120 });

	// Menu panel
	const menuEntity = world.createTransformEntity();
	menuEntity.object3D!.position.set(0, 1.35, -1.2);
	menuEntity.addComponent(PanelUI, { config: './ui/menu.json', maxWidth: 500, maxHeight: 600 });

	// Game over panel
	const gameoverEntity = world.createTransformEntity();
	gameoverEntity.object3D!.position.set(0, 1.35, -1.2);
	gameoverEntity.addComponent(PanelUI, { config: './ui/gover.json', maxWidth: 450, maxHeight: 500 });
	gameoverEntity.object3D!.visible = false;

	// Pause panel
	const pauseEntity = world.createTransformEntity();
	pauseEntity.object3D!.position.set(0, 1.35, -1.2);
	pauseEntity.addComponent(PanelUI, { config: './ui/pause.json', maxWidth: 400, maxHeight: 400 });
	pauseEntity.object3D!.visible = false;

	// Achievements panel
	const achvEntity = world.createTransformEntity();
	achvEntity.object3D!.position.set(0, 1.35, -1.2);
	achvEntity.addComponent(PanelUI, { config: './ui/trophies.json', maxWidth: 500, maxHeight: 700 });
	achvEntity.object3D!.visible = false;

	// Toast notification
	const toastEntity = world.createTransformEntity();
	toastEntity.object3D!.position.set(0, 1.85, -0.9);
	toastEntity.addComponent(PanelUI, { config: './ui/toast.json', maxWidth: 400, maxHeight: 80 });
	toastEntity.object3D!.visible = false;

	// Stats panel
	const statsEntity = world.createTransformEntity();
	statsEntity.object3D!.position.set(0, 1.35, -1.2);
	statsEntity.addComponent(PanelUI, { config: './ui/stats.json', maxWidth: 450, maxHeight: 650 });
	statsEntity.object3D!.visible = false;

	// Leaderboard panel
	const lbEntity = world.createTransformEntity();
	lbEntity.object3D!.position.set(0, 1.35, -1.2);
	lbEntity.addComponent(PanelUI, { config: './ui/lboard.json', maxWidth: 450, maxHeight: 700 });
	lbEntity.object3D!.visible = false;

	// Settings panel
	const settingsEntity = world.createTransformEntity();
	settingsEntity.object3D!.position.set(0, 1.35, -1.2);
	settingsEntity.addComponent(PanelUI, { config: './ui/settings.json', maxWidth: 450, maxHeight: 500 });
	settingsEntity.object3D!.visible = false;
}

main().catch(console.error);
