import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Reflejos de estudio generados en el navegador (RoomEnvironment de three).
 * Reemplaza `<Environment preset="studio" />` de drei, que bajaba un HDR de
 * 1,6 MB desde GitHub y dejaba el 3D en blanco hasta que llegaba (o para
 * siempre, si GitHub no respondía). Esto no descarga nada y tarda ~10 ms.
 */
export function StudioLighting({ intensity = 0.9 }: { intensity?: number }) {
  const gl = useThree(s => s.gl);
  const scene = useThree(s => s.scene);
  const invalidate = useThree(s => s.invalidate);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    scene.environment = env;
    scene.environmentIntensity = intensity;
    invalidate();
    return () => {
      if (scene.environment === env) scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, intensity, invalidate]);

  return null;
}
