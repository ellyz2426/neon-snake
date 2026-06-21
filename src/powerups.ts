// Power-ups system for Neon Snake VR
import {
	Mesh,
	Group,
	BoxGeometry,
	OctahedronGeometry,
	ConeGeometry,
	TorusGeometry,
	MeshStandardMaterial,
	PointLight,
	Vector3,
} from '@iwsdk/core';
import { CELL_SIZE, type GridPos } from './types';
import { gridToWorld } from './arena';

export enum PowerUpType {
	SpeedBoost = 'speed_boost',
	Invincibility = 'invincible',
	ScoreMultiplier = 'score_multi',
	Shrink = 'shrink',
	SlowMotion = 'slow_motion',
}

export interface PowerUpDef {
	type: PowerUpType;
	label: string;
	color: number;
	duration: number; // seconds
	spawnWeight: number;
}

export const POWERUP_DEFS: PowerUpDef[] = [
	{ type: PowerUpType.SpeedBoost, label: 'SPEED', color: 0xffaa00, duration: 5, spawnWeight: 3 },
	{ type: PowerUpType.Invincibility, label: 'SHIELD', color: 0x00ffff, duration: 4, spawnWeight: 1 },
	{ type: PowerUpType.ScoreMultiplier, label: '2X', color: 0xff00ff, duration: 6, spawnWeight: 3 },
	{ type: PowerUpType.Shrink, label: 'SHRINK', color: 0x44ff44, duration: 0, spawnWeight: 2 },
	{ type: PowerUpType.SlowMotion, label: 'SLOW', color: 0x8888ff, duration: 5, spawnWeight: 2 },
];

export interface ActivePowerUp {
	type: PowerUpType;
	remaining: number; // seconds remaining
}

export interface SpawnedPowerUp {
	pos: GridPos;
	type: PowerUpType;
	mesh: Mesh;
	light: PointLight;
	lifetime: number; // seconds remaining before despawn
}

export class PowerUpManager {
	private group: Group;
	private spawned: SpawnedPowerUp[] = [];
	private active: ActivePowerUp[] = [];
	private spawnTimer = 0;
	private spawnInterval = 12; // seconds between spawn attempts
	private animTime = 0;

	// Callbacks
	onCollect?: (type: PowerUpType, label: string) => void;
	onExpire?: (type: PowerUpType) => void;

	constructor(parentGroup: Group) {
		this.group = new Group();
		parentGroup.add(this.group);
	}

	update(delta: number): void {
		this.animTime += delta;

		// Update active power-ups
		for (let i = this.active.length - 1; i >= 0; i--) {
			this.active[i].remaining -= delta;
			if (this.active[i].remaining <= 0) {
				this.onExpire?.(this.active[i].type);
				this.active.splice(i, 1);
			}
		}

		// Update spawned power-up lifetimes & animations
		for (let i = this.spawned.length - 1; i >= 0; i--) {
			const pu = this.spawned[i];
			pu.lifetime -= delta;
			if (pu.lifetime <= 0) {
				this.removePowerUp(i);
				continue;
			}

			// Bobbing + rotation animation
			const bob = Math.sin(this.animTime * 3 + i * 1.5) * 0.015;
			const baseY = CELL_SIZE * 0.5 + 0.005;
			pu.mesh.position.y = baseY + bob;
			pu.mesh.rotation.y = this.animTime * 2;

			// Pulsing glow
			const pulse = Math.sin(this.animTime * 4 + i) * 0.3 + 0.7;
			const mat = pu.mesh.material as MeshStandardMaterial;
			mat.emissiveIntensity = 1.5 + pulse;
			pu.light.intensity = 0.3 + pulse * 0.3;

			// Blink when about to expire
			if (pu.lifetime < 3) {
				const blink = Math.sin(this.animTime * 10) > 0;
				pu.mesh.visible = blink;
			}
		}

		// Spawn timer
		this.spawnTimer += delta;
		if (this.spawnTimer >= this.spawnInterval && this.spawned.length < 2) {
			this.spawnTimer = 0;
			// 40% chance per tick
			if (Math.random() < 0.4) {
				return; // signal caller to spawn
			}
		}
	}

	shouldSpawn(): boolean {
		if (this.spawned.length >= 2) return false;
		if (this.spawnTimer < this.spawnInterval) return false;
		this.spawnTimer = 0;
		return Math.random() < 0.4;
	}

	spawn(pos: GridPos): void {
		// Pick random type based on weights
		const totalWeight = POWERUP_DEFS.reduce((s, d) => s + d.spawnWeight, 0);
		let roll = Math.random() * totalWeight;
		let chosen = POWERUP_DEFS[0];
		for (const def of POWERUP_DEFS) {
			roll -= def.spawnWeight;
			if (roll <= 0) { chosen = def; break; }
		}

		const worldPos = gridToWorld(pos.x, pos.z);
		const size = CELL_SIZE * 0.35;

		let geo;
		switch (chosen.type) {
			case PowerUpType.SpeedBoost:
				geo = new ConeGeometry(size, size * 1.5, 4);
				break;
			case PowerUpType.Invincibility:
				geo = new OctahedronGeometry(size);
				break;
			case PowerUpType.ScoreMultiplier:
				geo = new BoxGeometry(size, size, size);
				break;
			case PowerUpType.Shrink:
				geo = new TorusGeometry(size * 0.7, size * 0.25, 8, 8);
				break;
			case PowerUpType.SlowMotion:
				geo = new OctahedronGeometry(size, 1);
				break;
			default:
				geo = new BoxGeometry(size, size, size);
		}

		const mat = new MeshStandardMaterial({
			color: chosen.color,
			emissive: chosen.color,
			emissiveIntensity: 2.0,
			roughness: 0.1,
			metalness: 0.7,
			transparent: true,
			opacity: 0.9,
		});

		const mesh = new Mesh(geo, mat);
		mesh.position.set(worldPos.x, CELL_SIZE * 0.5 + 0.005, worldPos.z);
		this.group.add(mesh);

		const light = new PointLight(chosen.color, 0.4, 0.5);
		light.position.set(worldPos.x, 0.08, worldPos.z);
		this.group.add(light);

		this.spawned.push({
			pos,
			type: chosen.type,
			mesh,
			light,
			lifetime: 10,
		});
	}

	checkCollision(head: GridPos): PowerUpType | null {
		for (let i = 0; i < this.spawned.length; i++) {
			const pu = this.spawned[i];
			if (pu.pos.x === head.x && pu.pos.z === head.z) {
				const def = POWERUP_DEFS.find(d => d.type === pu.type)!;

				// Apply power-up
				if (def.duration > 0) {
					// Check if already active — refresh duration
					const existing = this.active.find(a => a.type === pu.type);
					if (existing) {
						existing.remaining = def.duration;
					} else {
						this.active.push({ type: pu.type, remaining: def.duration });
					}
				}

				this.onCollect?.(pu.type, def.label);
				this.removePowerUp(i);
				return pu.type;
			}
		}
		return null;
	}

	isActive(type: PowerUpType): boolean {
		return this.active.some(a => a.type === type);
	}

	getActiveTypes(): PowerUpType[] {
		return this.active.map(a => a.type);
	}

	getActiveRemaining(type: PowerUpType): number {
		const a = this.active.find(x => x.type === type);
		return a ? a.remaining : 0;
	}

	getSpawnedPositions(): GridPos[] {
		return this.spawned.map(s => s.pos);
	}

	clearAll(): void {
		while (this.spawned.length > 0) {
			this.removePowerUp(0);
		}
		this.active = [];
		this.spawnTimer = 0;
	}

	private removePowerUp(index: number): void {
		const pu = this.spawned[index];
		this.group.remove(pu.mesh);
		this.group.remove(pu.light);
		pu.mesh.geometry.dispose();
		(pu.mesh.material as MeshStandardMaterial).dispose();
		this.spawned.splice(index, 1);
	}
}
