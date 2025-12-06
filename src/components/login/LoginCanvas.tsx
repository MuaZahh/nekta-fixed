import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import vertexShader from './shaders/vertexShader.glsl?raw'
import fragmentShader from './shaders/fragmentShader.glsl?raw'

export const LoginCanvas = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }
    let hover = false
    let frameId: number

    const clientWidth = containerRef.current.clientWidth
    const clientHeight = containerRef.current.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      clientWidth / clientHeight,
      0.1,
      100
    )
    camera.position.z = 8

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(clientWidth, clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0x000000, 0)

    containerRef.current.appendChild(renderer.domElement)

    const uniforms = {
      u_time: { value: 0.0 },
      u_intensity: { value: 0.3 },
    }

    const geometry = new THREE.IcosahedronGeometry(2, 20)
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      wireframe: false,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = 2
    mesh.scale.set(0.75, 0.75, 0.75)
    scene.add(mesh)

    const onMouseMove = (event: MouseEvent) => {
    }

    containerRef.current.addEventListener('mousemove', onMouseMove)

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      uniforms.u_time.value = 0.4 * performance.now() * 0.001
      uniforms.u_intensity.value = THREE.MathUtils.lerp(
        uniforms.u_intensity.value,
        hover ? 0.85 : 0.15,
        0.02
      )
      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      const cw = containerRef.current?.clientWidth || 1
      const ch = containerRef.current?.clientHeight || 1

      camera.aspect = cw / ch
      camera.updateProjectionMatrix()
      renderer.setSize(cw, ch)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      containerRef.current?.removeChild(renderer.domElement)
      window.removeEventListener('resize', handleResize)
      containerRef.current?.removeEventListener('mousemove', onMouseMove)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#F3F3EE' }}
    />
  )
}
