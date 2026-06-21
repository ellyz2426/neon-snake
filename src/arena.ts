import {
	Mesh,
	Group,
	BoxGeometry,
	SphereGeometry,
	MeshStandardMaterial,
	MeshBasicMaterial,
	LineSegments,
	EdgesGeometry,
	LineBasicMaterial,
	PlaneGeometry,
	Color,
	Vector3,
	AmbientLight,
	PointLight,
	DirectionalLight,
	FogExp2,
	Float32BufferAttribute,
	BufferGeometry,
	AdditiveBlending,
	Points,
	PointsMaterial,
} from '@iwsdk/core';
import type { World } from '@iwsdk/core';
import { GRID_SIZE, CELL_SIZE, BOARD_Y, BOARD_Z, ArenaTheme, ARENA_THEME_DEFS } from './types';
import type { ArenaThemeDef } from './types';

export interface ArenaRefs {
	group: Group;
	gridLineMat: LineBasicMaterial;
	wallMat: MeshStandardMaterial;
	boardMat: MeshStandardMaterial;
	cornerLights: PointLight[];
	centerLight: PointLight;
	starMat: PointsMaterial;
	stars: Points;
	world: World;
}

export function createArena(world: World): ArenaRefs {
	const arena = new Group();
	arena.position.set(0, BOARD_Y, BOARD_Z);
	world.scene.add(arena);

	// Dark fog
	world.scene.fog = new FogExp2(0x000811, 0.12);
	world.scene.background = new Color(0x000308);

	// Lighting
	const ambient = new AmbientLight(0x1a1a3a, 0.6);
	world.scene.add(ambient);

	const mainLight = new DirectionalLight(0x6688ff, 0.4);
	mainLight.position.set(0, 5, 2);
	world.scene.add(mainLight);

	// Starfield
	const starCount = 200;
	const starGeo = new BufferGeometry();
	const starPositions = new Float32Array(starCount * 3);
	for (let i = 0; i < starCount; i++) {
		starPositions[i * 3] = (Math.random() - 0.5) * 20;
		starPositions[i * 3 + 1] = Math.random() * 8 + 1;
		starPositions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 3;
	}
	starGeo.setAttribute('position', new Float32BufferAttribute(starPositions, 3));
	const starMat = new PointsMaterial({ color: 0x4466aa, size: 0.02, transparent: true, opacity: 0.6 });
	const stars = new Points(starGeo, starMat);
	world.scene.add(stars);

	// Board base
	const boardWidth = GRID_SIZE * CELL_SIZE;
	const boardGeo = new PlaneGeometry(boardWidth, boardWidth);
	const boardMat = new MeshStandardMaterial({
		color: 0x050515,
		roughness: 0.3,
		metalness: 0.8,
	});
	const board = new Mesh(boardGeo, boardMat);
	board.rotation.x = -Math.PI / 2;
	board.position.set(0, 0, 0);
	arena.add(board);

	// Grid lines
	const gridGroup = new Group();
	const lineMat = new LineBasicMaterial({ color: 0x1a2255, transparent: true, opacity: 0.4 });
	const halfBoard = boardWidth / 2;

	for (let i = 0; i <= GRID_SIZE; i++) {
		const offset = -halfBoard + i * CELL_SIZE;

		// Horizontal lines
		const hGeo = new BufferGeometry();
		hGeo.setAttribute('position', new Float32BufferAttribute([
			-halfBoard, 0.001, offset,
			halfBoard, 0.001, offset,
		], 3));
		gridGroup.add(new LineSegments(hGeo, lineMat));

		// Vertical lines
		const vGeo = new BufferGeometry();
		vGeo.setAttribute('position', new Float32BufferAttribute([
			offset, 0.001, -halfBoard,
			offset, 0.001, halfBoard,
		], 3));
		gridGroup.add(new LineSegments(vGeo, lineMat));
	}
	arena.add(gridGroup);

	// Border walls (glowing edges)
	const wallHeight = 0.04;
	const wallThickness = 0.008;
	const wallMat = new MeshStandardMaterial({
		color: 0x00ccff,
		emissive: 0x0088cc,
		emissiveIntensity: 2.0,
		roughness: 0.1,
		metalness: 0.9,
	});

	const createWall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
		const wall = new Mesh(new BoxGeometry(w, h, d), wallMat);
		wall.position.set(x, y, z);
		return wall;
	};

	// Four border walls
	arena.add(createWall(boardWidth + wallThickness * 2, wallHeight, wallThickness, 0, wallHeight / 2, -halfBoard - wallThickness / 2));
	arena.add(createWall(boardWidth + wallThickness * 2, wallHeight, wallThickness, 0, wallHeight / 2, halfBoard + wallThickness / 2));
	arena.add(createWall(wallThickness, wallHeight, boardWidth, -halfBoard - wallThickness / 2, wallHeight / 2, 0));
	arena.add(createWall(wallThickness, wallHeight, boardWidth, halfBoard + wallThickness / 2, wallHeight / 2, 0));

	// Corner glow points
	const cornerLights: PointLight[] = [];
	const corners = [
		[-halfBoard, halfBoard],
		[halfBoard, halfBoard],
		[-halfBoard, -halfBoard],
		[halfBoard, -halfBoard],
	];
	for (const [cx, cz] of corners) {
		const light = new PointLight(0x00ccff, 0.3, 1.5);
		light.position.set(cx, 0.1, cz);
		arena.add(light);
		cornerLights.push(light);
	}

	// Center glow
	const centerLight = new PointLight(0x4400ff, 0.2, 2.0);
	centerLight.position.set(0, 0.15, 0);
	arena.add(centerLight);

	return { group: arena, gridLineMat: lineMat, wallMat, boardMat, cornerLights, centerLight, starMat, stars, world };
}

export function gridToWorld(gx: number, gz: number): Vector3 {
	const halfBoard = (GRID_SIZE * CELL_SIZE) / 2;
	return new Vector3(
		-halfBoard + (gx + 0.5) * CELL_SIZE,
		0,
		-halfBoard + (gz + 0.5) * CELL_SIZE,
	);
}

export function applyTheme(refs: ArenaRefs, theme: ArenaTheme): void {
	const def = ARENA_THEME_DEFS.find(t => t.id === theme) ?? ARENA_THEME_DEFS[0];

	refs.boardMat.color.setHex(def.boardColor);
	refs.gridLineMat.color.setHex(def.gridColor);
	refs.wallMat.color.setHex(def.wallColor);
	refs.wallMat.emissive.setHex(def.wallEmissive);

	for (const light of refs.cornerLights) {
		light.color.setHex(def.cornerLightColor);
	}
	refs.centerLight.color.setHex(def.centerLightColor);

	refs.starMat.color.setHex(def.starColor);

	if (refs.world.scene.fog instanceof FogExp2) {
		refs.world.scene.fog.color.setHex(def.fogColor);
	}
	if (refs.world.scene.background instanceof Color) {
		refs.world.scene.background.setHex(def.bgColor);
	}
}
