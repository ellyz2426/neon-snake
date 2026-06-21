// Trail effect system for Neon Snake VR
import {
	Mesh,
	Group,
	BoxGeometry,
	MeshStandardMaterial,
	Color,
} from '@iwsdk/core';
import { CELL_SIZE } from './types';

interface TrailSegment {
	mesh: Mesh;
	life: number; // 0 to 1
	maxLife: number;
}

export class TrailSystem {
	private group: Group;
	private segments: TrailSegment[] = [];
	private pool: Mesh[] = [];
	private readonly maxSegments = 40;
	private readonly segmentLifetime = 1.2; // seconds

	private baseColor = new Color(0x00ff88);
	private trailColor = new Color(0x004422);
	private tempColor = new Color();

	constructor(parentGroup: Group) {
		this.group = new Group();
		parentGroup.add(this.group);

		// Pre-allocate mesh pool
		const size = CELL_SIZE * 0.6;
		const geo = new BoxGeometry(size, 0.004, size);
		for (let i = 0; i < this.maxSegments; i++) {
			const mat = new MeshStandardMaterial({
				color: 0x004422,
				emissive: 0x004422,
				emissiveIntensity: 1.0,
				roughness: 0.3,
				metalness: 0.5,
				transparent: true,
				opacity: 0.6,
			});
			const mesh = new Mesh(geo, mat);
			mesh.visible = false;
			this.group.add(mesh);
			this.pool.push(mesh);
		}
	}

	addSegment(worldX: number, worldZ: number): void {
		// Get mesh from pool
		let mesh: Mesh;
		if (this.pool.length > 0) {
			mesh = this.pool.pop()!;
		} else {
			// Recycle oldest
			const oldest = this.segments.shift();
			if (!oldest) return;
			mesh = oldest.mesh;
		}

		mesh.position.set(worldX, 0.003, worldZ);
		mesh.visible = true;

		this.segments.push({
			mesh,
			life: this.segmentLifetime,
			maxLife: this.segmentLifetime,
		});
	}

	update(delta: number): void {
		for (let i = this.segments.length - 1; i >= 0; i--) {
			const seg = this.segments[i];
			seg.life -= delta;

			if (seg.life <= 0) {
				seg.mesh.visible = false;
				this.pool.push(seg.mesh);
				this.segments.splice(i, 1);
				continue;
			}

			const t = seg.life / seg.maxLife; // 1 = fresh, 0 = expired
			const mat = seg.mesh.material as MeshStandardMaterial;
			mat.opacity = t * 0.5;

			this.tempColor.copy(this.baseColor).lerp(this.trailColor, 1 - t);
			mat.emissive.copy(this.tempColor);
			mat.emissiveIntensity = t * 1.2;

			// Shrink as it fades
			const scale = 0.5 + t * 0.5;
			seg.mesh.scale.set(scale, 1, scale);
		}
	}

	setColor(color: number): void {
		this.baseColor.set(color);
	}

	clearAll(): void {
		for (const seg of this.segments) {
			seg.mesh.visible = false;
			this.pool.push(seg.mesh);
		}
		this.segments = [];
	}
}
