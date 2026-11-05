import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { MeshData } from '../core/types'

interface PreviewProps {
  mesh: MeshData | null
  texture: HTMLCanvasElement | null
  view: 'lit' | 'clay'
  diameter: number
  height: number
}

interface SceneRefs {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  group: THREE.Group
  lit: THREE.Mesh | null
  clay: THREE.Mesh | null
  litTexture: THREE.CanvasTexture | null
  litTextureSource: HTMLCanvasElement | null
  pointLight: THREE.PointLight
  raf: number
  observer: ResizeObserver
}

export function Preview({ mesh, texture, view, diameter, height }: PreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const refs = useRef<SceneRefs | null>(null)
  const dimsRef = useRef({ diameter, height })
  dimsRef.current = { diameter, height }
  const framingRef = useRef('')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.setSize(host.clientWidth, host.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(36, host.clientWidth / host.clientHeight, 0.1, 2000)
    const { diameter: d0, height: h0 } = dimsRef.current
    const dist0 = Math.max(h0 * 2.45, d0 * 2.45, 320)
    camera.position.set(dist0 * 0.58, h0 * 0.62, dist0 * 0.82)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, h0 * 0.5, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.55
    controls.minDistance = 120
    controls.maxDistance = 900
    controls.maxPolarAngle = Math.PI * 0.495

    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x15181c, 1.15))

    const key = new THREE.DirectionalLight(0xfff1dd, 1.6)
    key.position.set(180, 320, 220)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -200
    key.shadow.camera.right = 200
    key.shadow.camera.top = 260
    key.shadow.camera.bottom = -60
    scene.add(key)

    const rim = new THREE.DirectionalLight(0xa9c4ff, 0.55)
    rim.position.set(-220, 160, -180)
    scene.add(rim)

    const pointLight = new THREE.PointLight(0xffb067, 3.2, 420, 1.6)
    pointLight.position.set(0, 18, 0)
    scene.add(pointLight)

    const group = new THREE.Group()
    group.rotation.x = -Math.PI / 2
    scene.add(group)

    const state: SceneRefs = {
      renderer,
      scene,
      camera,
      controls,
      group,
      lit: null,
      clay: null,
      litTexture: null,
      litTextureSource: null,
      pointLight,
      raf: 0,
      observer: new ResizeObserver(() => {
        const w = host.clientWidth
        const h = host.clientHeight
        if (w === 0 || h === 0) return
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }),
    }
    state.observer.observe(host)
    refs.current = state

    const loop = () => {
      state.raf = requestAnimationFrame(loop)
      controls.update()
      renderer.render(scene, camera)
    }
    state.raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(state.raf)
      state.observer.disconnect()
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
      refs.current = null
    }
  }, [])

  useEffect(() => {
    const r = refs.current
    if (!r) return
    const { group } = r

    if (r.clay) {
      r.clay.geometry.dispose()
      ;(r.clay.material as THREE.Material).dispose()
      group.remove(r.clay)
      r.clay = null
    }
    if (mesh) {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3))
      geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1))
      geometry.computeVertexNormals()
      const material = new THREE.MeshStandardMaterial({
        color: 0xf4efe6,
        roughness: 0.78,
        metalness: 0,
        side: THREE.DoubleSide,
      })
      const clay = new THREE.Mesh(geometry, material)
      // Keep the clay mesh's front aligned with the lit texture's 180° meridian.
      clay.rotation.z = Math.PI / 2
      clay.castShadow = true
      clay.receiveShadow = true
      group.add(clay)
      r.clay = clay
    }

    if (r.lit) {
      r.lit.geometry.dispose()
      ;(r.lit.material as THREE.Material).dispose()
      group.remove(r.lit)
      r.lit = null
    }
    if (texture) {
      if (r.litTextureSource !== texture) {
        r.litTexture?.dispose()
        const tex = new THREE.CanvasTexture(texture)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        tex.anisotropy = r.renderer.capabilities.getMaxAnisotropy()
        r.litTexture = tex
        r.litTextureSource = texture
      }
      const geometry = new THREE.CylinderGeometry(diameter / 2, diameter / 2, height, 320, 1, true, -Math.PI)
      const material = new THREE.MeshBasicMaterial({
        map: r.litTexture,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
      const lit = new THREE.Mesh(geometry, material)
      // CylinderGeometry is Y-up; the group expects a Z-up shell.
      lit.rotation.x = Math.PI / 2
      lit.position.z = height / 2
      group.add(lit)
      r.lit = lit
    }

    if (r.lit) r.lit.visible = view === 'lit'
    if (r.clay) r.clay.visible = view === 'clay'
    r.pointLight.intensity = view === 'lit' ? 3.2 : 0.35

    const dist = Math.max(height * 2.45, diameter * 2.45, 320)
    const signature = `${diameter}|${height}`
    if (framingRef.current !== signature) {
      framingRef.current = signature
      r.camera.position.set(dist * 0.58, height * 0.62, dist * 0.82)
    }
    r.controls.target.set(0, height * 0.5, 0)
    r.camera.updateProjectionMatrix()
  }, [mesh, texture, view, diameter, height])

  return <div className="preview-host" ref={hostRef} />
}
