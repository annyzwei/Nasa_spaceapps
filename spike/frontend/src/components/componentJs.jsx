// ThreeScene.jsx
import React, { useEffect, useRef } from "react"
import * as THREE from "three"

export default function ThreeScene() {
  const mountRef = useRef(null)

  useEffect(() => {
    // Set up scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.z = 5

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    mountRef.current.appendChild(renderer.domElement)

    // Add a cube
    const geometry = new THREE.BoxGeometry()
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff })
    const cube = new THREE.Mesh(geometry, material)
    scene.add(cube)

    // Lights
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(5, 5, 5)
    scene.add(light)

    // Animation loop
    const animate = () => {
      cube.rotation.x += 0.01
      cube.rotation.y += 0.01
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }
    animate()

    // Cleanup on unmount
    return () => {
      mountRef.current.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ width: "100%", height: "100vh" }} />
}
