/**
 * "Ver en AR": la pieza tal como está diseñada (color, grabado, texto), a
 * tamaño real, sobre el piso o la mesa del cliente. Sin subir nada al server:
 * el modelo se arma en el navegador desde la escena del visor.
 *
 *  - iPhone / iPad (Safari): se exporta a USDZ y se abre en AR Quick Look.
 *  - Android (Chrome con ARCore): sesión WebXR "immersive-ar" en la misma
 *    página, con un aro que marca la superficie; un toque apoya la pieza.
 *
 * Módulo pesado (exportador, RoomEnvironment): se importa recién al pedir AR.
 */
import * as THREE from "three";

export type ArMode = "quicklook" | "webxr";

/** Qué AR ofrece este dispositivo (null: ninguno, el botón no se muestra). */
export async function detectAR(): Promise<ArMode | null> {
  if (typeof document === "undefined") return null;
  try {
    const a = document.createElement("a");
    if (a.relList?.supports?.("ar")) return "quicklook";
  } catch { /* sin relList */ }
  // Chrome, Firefox, Edge y la app de Google en iPhone/iPad usan el motor de
  // Safari y abren Quick Look igual, pero `relList.supports("ar")` les da false.
  // iPadOS se presenta como Mac: se lo reconoce por la pantalla táctil.
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS && /CriOS\/|FxiOS\/|EdgiOS\/|GSA\/|DuckDuckGo\//.test(ua)) return "quicklook";
  try {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    if (xr && (await xr.isSessionSupported("immersive-ar"))) return "webxr";
  } catch { /* sin WebXR */ }
  return null;
}

/** Lo que entrega el visor: la pieza (apoyada en y = 0) y su escala real. */
export interface ArModel {
  object: THREE.Object3D;
  /** Metros por unidad de escena. */
  metersPerUnit: number;
}

/**
 * La pieza en metros, lista para exportar o colocar. La escala va en un grupo
 * HIJO: el exportador USDZ toma el objeto raíz como escena e ignora su propia
 * transformación (con la escala en la raíz, la pieza salía de ~3 m).
 */
function inMeters({ object, metersPerUnit }: ArModel): THREE.Group {
  const scaled = new THREE.Group();
  scaled.add(object);
  scaled.scale.setScalar(metersPerUnit);
  const root = new THREE.Group();
  root.add(scaled);
  root.updateMatrixWorld(true);
  return root;
}

// ── iOS: AR Quick Look ───────────────────────────────────────────────────────

/**
 * Exporta a USDZ y devuelve una URL blob. Abrirla tiene que ser un toque del
 * cliente sobre un <a rel="ar"> (Safari no abre Quick Look desde un await), así
 * que la UI la prepara primero y después muestra el enlace.
 */
export async function buildQuickLookUrl(model: ArModel): Promise<string> {
  const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
  const root = inMeters(model);
  const buffer = await new USDZExporter().parseAsync(root, {
    quickLookCompatible: true,
    // 2048: el grabado es texto chico sobre una textura que da toda la vuelta.
    maxTextureSize: 2048,
  });
  return URL.createObjectURL(new Blob([buffer], { type: "model/vnd.usdz+zip" }));
}

// ── Android: WebXR ───────────────────────────────────────────────────────────

type XRSessionLike = EventTarget & {
  end(): Promise<void>;
  requestReferenceSpace(t: string): Promise<unknown>;
  requestHitTestSource?(o: { space: unknown }): Promise<{ cancel(): void }> | undefined;
};

/**
 * Abre la sesión AR. Hay que llamarla directo desde el toque del botón: el
 * navegador exige el gesto del usuario para `requestSession`, así que es lo
 * primero que hace (antes de armar la escena).
 */
export async function startWebXR(model: ArModel, opts: { onEnd?: () => void } = {}): Promise<void> {
  const xr = (navigator as unknown as { xr: { requestSession(m: string, o: object): Promise<XRSessionLike> } }).xr;

  // Capa HTML sobre la cámara (dom-overlay): indicación y botón de salir.
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:system-ui,sans-serif";
  const hint = document.createElement("div");
  hint.textContent = "Mové el celular despacio para encontrar el piso o una mesa";
  hint.style.cssText = "position:absolute;left:16px;right:16px;bottom:max(24px,env(safe-area-inset-bottom));text-align:center;color:#fff;font-size:15px;background:rgba(0,0,0,.55);padding:12px 16px;border-radius:14px";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "✕ Salir";
  close.style.cssText = "position:absolute;top:max(16px,env(safe-area-inset-top));right:16px;pointer-events:auto;border:0;border-radius:999px;padding:10px 16px;font-size:15px;background:rgba(0,0,0,.6);color:#fff";
  overlay.append(hint, close);
  document.body.appendChild(overlay);

  let session: XRSessionLike;
  try {
    session = await xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: overlay },
    });
  } catch (e) {
    overlay.remove();
    throw e;
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local");

  const scene = new THREE.Scene();
  // Reflejos para el acero y la pintura (sin entorno, el metal se ve negro).
  const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(0.5, 1, 0.3);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera();

  const piece = inMeters(model);
  piece.visible = false;
  scene.add(piece);

  // Aro sobre la superficie detectada.
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.08, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  await renderer.xr.setSession(session as unknown as XRSession);

  const viewerSpace = await session.requestReferenceSpace("viewer");
  const hitSource = await session.requestHitTestSource?.({ space: viewerSpace });

  session.addEventListener("select", () => {
    if (!reticle.visible) return;
    piece.position.setFromMatrixPosition(reticle.matrix);
    // De frente al cliente: girar la pieza hacia la cámara, solo en Y.
    const cam = renderer.xr.getCamera();
    const dx = cam.position.x - piece.position.x;
    const dz = cam.position.z - piece.position.z;
    piece.rotation.set(0, Math.atan2(dx, dz), 0);
    piece.visible = true;
    hint.textContent = "Tocá otro lugar para moverla";
  });

  renderer.setAnimationLoop((_t, frame) => {
    if (frame && hitSource) {
      const ref = renderer.xr.getReferenceSpace();
      const hits = frame.getHitTestResults(hitSource as unknown as XRHitTestSource);
      const pose = hits.length && ref ? hits[0].getPose(ref) : null;
      reticle.visible = !!pose;
      if (pose) {
        reticle.matrix.fromArray(pose.transform.matrix);
        if (!piece.visible) hint.textContent = "Tocá la pantalla para apoyar la pieza";
      }
    }
    renderer.render(scene, camera);
  });

  const cleanup = () => {
    renderer.setAnimationLoop(null);
    hitSource?.cancel();
    // La geometría y los materiales de la pieza son los del visor: no se
    // liberan acá. Solo lo propio de esta sesión.
    reticle.geometry.dispose();
    (reticle.material as THREE.Material).dispose();
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
    overlay.remove();
    opts.onEnd?.();
  };
  session.addEventListener("end", cleanup, { once: true });
  close.addEventListener("click", () => { session.end().catch(cleanup); });
}
