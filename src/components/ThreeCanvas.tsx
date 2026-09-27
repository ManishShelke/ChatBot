import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeCanvasProps {
  className?: string;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({ className = 'w-full h-full' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting setup for luxury editorial mood
    const ambientLight = new THREE.AmbientLight(0xfff0ba, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7d6, 1.8);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x526938, 2.2);
    rimLight.position.set(-6, -4, -4);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xfff0ba, 1.2, 20);
    fillLight.position.set(0, -3, 4);
    scene.add(fillLight);

    // Master group responding to cursor
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // Core Deformed Icosahedron
    const coreGeometry = new THREE.IcosahedronGeometry(1.65, 3);
    const positionAttribute = coreGeometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < positionAttribute.count; i++) {
      v.fromBufferAttribute(positionAttribute, i);
      const length = v.length();
      const noise = Math.sin(v.x * 2.5) * Math.cos(v.y * 2.5) * Math.sin(v.z * 2.5);
      v.normalize().multiplyScalar(length + noise * 0.22);
      positionAttribute.setXYZ(i, v.x, v.y, v.z);
    }
    coreGeometry.computeVertexNormals();

    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0x17230d,
      emissive: 0x070d03,
      specular: 0xfff0ba,
      shininess: 95,
      flatShading: false,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    masterGroup.add(coreMesh);

    // Outer wireframe cage
    const wireframeGeo = new THREE.IcosahedronGeometry(1.85, 2);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0xfff0ba,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeo, wireframeMat);
    masterGroup.add(wireframeMesh);

    // Orbital Rings
    const rings: { mesh: THREE.Mesh; speed: number }[] = [];
    const ringData = [
      { radius: 2.5, tube: 0.02, rotX: 1.1, rotY: 0.4, speed: 0.006, color: 0x27301e },
      { radius: 3.1, tube: 0.015, rotX: -0.6, rotY: 1.2, speed: -0.004, color: 0xfff0ba },
      { radius: 3.6, tube: 0.018, rotX: 0.8, rotY: -0.9, speed: 0.005, color: 0x39412e },
    ];

    ringData.forEach((d) => {
      const rGeo = new THREE.TorusGeometry(d.radius, d.tube, 16, 120);
      const rMat = new THREE.MeshPhongMaterial({
        color: d.color,
        specular: 0xfff0ba,
        shininess: 80,
        transparent: true,
        opacity: 0.75,
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = d.rotX;
      ring.rotation.y = d.rotY;
      masterGroup.add(ring);
      rings.push({ mesh: ring, speed: d.speed });
    });

    // Satellite Neural Nodes
    const particlesCount = 45;
    const particlesGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      const r = 2.4 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      posArray[i] = r * Math.sin(phi) * Math.cos(theta);
      posArray[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      posArray[i + 2] = r * Math.cos(phi);
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.065,
      color: 0xfff0ba,
      transparent: true,
      opacity: 0.85,
    });
    const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
    masterGroup.add(particlesMesh);

    // Mouse tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      targetX = (x / rect.width - 0.5) * 1.5;
      targetY = (y / rect.height - 0.5) * 1.5;
    };

    window.addEventListener('mousemove', onMouseMove);

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      masterGroup.rotation.y = elapsedTime * 0.18 + mouseX * 0.8;
      masterGroup.rotation.x = Math.sin(elapsedTime * 0.22) * 0.12 - mouseY * 0.8;

      const scale = 1 + Math.sin(elapsedTime * 1.2) * 0.035;
      coreMesh.scale.set(scale, scale, scale);

      rings.forEach((r) => {
        r.mesh.rotation.z += r.speed;
        r.mesh.rotation.x += r.speed * 0.6;
      });

      particlesMesh.rotation.y = -elapsedTime * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      wireframeGeo.dispose();
      wireframeMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
    };
  }, []);

  return <div ref={containerRef} className={className} />;
};
