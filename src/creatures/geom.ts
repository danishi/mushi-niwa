import * as THREE from 'three';
import { sharedGeo } from '../three/toon';

/** 根元から先へ細くなるチューブ（角・触角・脚など） */
export function taperedTube(points: THREE.Vector3[], r0: number, r1: number, segs = 16, radial = 8): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, c);
    const r = THREE.MathUtils.lerp(r0, r1, t);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  // 先端をふさぐ小さな球は省略（輪郭線で十分丸く見える）
  geo.computeVertexNormals();
  return geo;
}

export function cachedTube(key: string, points: [number, number, number][], r0: number, r1: number, segs = 16, radial = 8) {
  return sharedGeo(`tube:${key}`, () =>
    taperedTube(points.map((p) => new THREE.Vector3(...p)), r0, r1, segs, radial),
  );
}

/** 蝶のはねなどの平たい形 */
export function shapeGeo(key: string, build: (s: THREE.Shape) => void, depth = 0): THREE.BufferGeometry {
  return sharedGeo(`shape:${key}`, () => {
    const s = new THREE.Shape();
    build(s);
    const g = depth > 0 ? new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }) : new THREE.ShapeGeometry(s, 12);
    g.computeVertexNormals();
    return g;
  });
}

/** 半球（甲虫の前ばね・テントウの背中） */
export function halfSphere(): THREE.BufferGeometry {
  return sharedGeo('halfSphere', () => new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2));
}

/** 縦に半分の楕円体（左右の前ばね） */
export function elytronGeo(): THREE.BufferGeometry {
  return sharedGeo('elytron', () => new THREE.SphereGeometry(1, 16, 12, 0, Math.PI, 0, Math.PI / 2));
}
