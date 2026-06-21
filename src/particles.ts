// Particle effects for Neon Snake VR
import {
	Group,
	Mesh,
	SphereGeometry,
	BoxGeometry,
	MeshStandardMaterial,
	Vector3,
	Color,
} from '@iwsdk/core';

interface Particle {
	mesh: Mesh;
	velocity: Vector3;
	life: number;
	maxLife: number;
	startScale: number;
}

export class ParticleSystem {
	private group: Group;
	private particles: Particle[] = [];
	private pool: Mesh[] = [];

	constructor(parent: Group) {
		this.group = new Group();
		parent.add(this.group);
	}

	spawnEatEffect(position: Vector3, color: number, count = 8) {
		for (let i = 0; i < count; i++) {
			const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
			const speed = 0.5 + Math.random() * 0.8;
			const vx = Math.cos(angle) * speed;
			const vz = Math.sin(angle) * speed;
			const vy = 0.5 + Math.random() * 1.0;

			this.spawn(position, new Vector3(vx, vy, vz), color, 0.6 + Math.random() * 0.4, 0.015);
		}
	}

	spawnDeathEffect(position: Vector3, count = 20) {
		for (let i = 0; i < count; i++) {
			const angle = Math.random() * Math.PI * 2;
			const elevation = Math.random() * Math.PI;
			const speed = 0.3 + Math.random() * 1.2;
			const vx = Math.sin(elevation) * Math.cos(angle) * speed;
			const vy = Math.cos(elevation) * speed + 0.5;
			const vz = Math.sin(elevation) * Math.sin(angle) * speed;

			const colors = [0x00ff88, 0xff2266, 0x00ccff, 0xffaa00];
			const color = colors[Math.floor(Math.random() * colors.length)];
			this.spawn(position, new Vector3(vx, vy, vz), color, 1.0 + Math.random() * 0.5, 0.02);
		}
	}

	spawnComboEffect(position: Vector3, combo: number) {
		const count = Math.min(combo * 3, 15);
		for (let i = 0; i < count; i++) {
			const angle = (i / count) * Math.PI * 2;
			const speed = 0.8 + combo * 0.2;
			const vx = Math.cos(angle) * speed;
			const vz = Math.sin(angle) * speed;
			const vy = 1.0 + Math.random() * 0.5;

			const hue = (combo * 40 + i * 20) % 360;
			const color = new Color().setHSL(hue / 360, 1.0, 0.6);
			this.spawn(position, new Vector3(vx, vy, vz), color.getHex(), 0.8, 0.012);
		}
	}

	private spawn(pos: Vector3, vel: Vector3, color: number, life: number, size: number) {
		let mesh = this.pool.pop();
		if (!mesh) {
			const geo = new BoxGeometry(1, 1, 1);
			const mat = new MeshStandardMaterial({
				color,
				emissive: color,
				emissiveIntensity: 2.0,
				roughness: 0.1,
				metalness: 0.5,
			});
			mesh = new Mesh(geo, mat);
		} else {
			const mat = mesh.material as MeshStandardMaterial;
			mat.color.setHex(color);
			mat.emissive.setHex(color);
			mat.emissiveIntensity = 2.0;
		}

		mesh.position.copy(pos);
		mesh.scale.setScalar(size);
		mesh.visible = true;
		this.group.add(mesh);

		this.particles.push({
			mesh,
			velocity: vel,
			life,
			maxLife: life,
			startScale: size,
		});
	}

	update(delta: number) {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= delta;

			if (p.life <= 0) {
				this.group.remove(p.mesh);
				p.mesh.visible = false;
				this.pool.push(p.mesh);
				this.particles.splice(i, 1);
				continue;
			}

			// Physics
			p.velocity.y -= 2.0 * delta; // gravity
			p.mesh.position.addScaledVector(p.velocity, delta);

			// Fade
			const t = p.life / p.maxLife;
			p.mesh.scale.setScalar(p.startScale * t);
			const mat = p.mesh.material as MeshStandardMaterial;
			mat.emissiveIntensity = 2.0 * t;
			mat.opacity = t;

			// Rotation
			p.mesh.rotation.x += delta * 3;
			p.mesh.rotation.z += delta * 2;
		}
	}

	clear() {
		for (const p of this.particles) {
			this.group.remove(p.mesh);
			p.mesh.visible = false;
			this.pool.push(p.mesh);
		}
		this.particles = [];
	}
}
