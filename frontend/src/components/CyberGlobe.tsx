"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

// Dynamically import the Globe component to avoid SSR issues
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

export default function CyberGlobe() {
  const globeEl = useRef<any>(null);
  const [arcsData, setArcsData] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Fetch countries data
    fetch('/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => setCountries(data.features));
    
    // Set initial dimensions based on screen size (reduced for performance)
    const updateDimensions = () => {
      const size = window.innerWidth < 768 ? 260 : window.innerWidth < 1024 ? 380 : 450;
      setDimensions({ width: size, height: size });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Generate random arcs (reduced count for mobile performance)
    const N = 25;
    const arcs = [...Array(N).keys()].map(() => ({
      startLat: (Math.random() - 0.5) * 180,
      startLng: (Math.random() - 0.5) * 360,
      endLat: (Math.random() - 0.5) * 180,
      endLng: (Math.random() - 0.5) * 360,
      color: Math.random() > 0.3 ? ['#d32f2f', '#f57c00'] : ['#3b82f6', '#0a2540'] // Critical/Warning vs Blue
    }));

    setArcsData(arcs);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Poll for the ref to be attached to configure controls
  useEffect(() => {
    if (!mounted) return;
    
    const interval = setInterval(() => {
      if (globeEl.current) {
        const controls = globeEl.current.controls();
        if (controls) {
          // Set point of view to India
          globeEl.current.pointOfView({ lat: 20.5937, lng: 78.9629, altitude: 2 }, 1000);
          controls.autoRotate = true;
          controls.autoRotateSpeed = 1.2;
          controls.enableZoom = false; // Disable zoom to prevent scroll trapping
          clearInterval(interval);
        }
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [mounted]);

  if (!mounted) return <div style={{ width: dimensions.width, height: dimensions.height }} className="animate-pulse bg-forensic-blue/5 rounded-full mx-auto" />;

  return (
    <div className="flex items-center justify-center cursor-move mx-auto" style={{ width: dimensions.width, height: dimensions.height }}>
      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere={true}
        atmosphereColor="#3b82f6"
        atmosphereAltitude={0.15}
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcsTransitionDuration={0}
        polygonsData={countries}
        polygonCapColor={(d: any) => d.properties.ISO_A2 === 'IN' ? 'rgba(255, 215, 0, 0.9)' : 'rgba(10, 37, 64, 0.7)'}
        polygonSideColor={(d: any) => d.properties.ISO_A2 === 'IN' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(10, 37, 64, 0.1)'}
        polygonStrokeColor={(d: any) => d.properties.ISO_A2 === 'IN' ? '#ffffff' : 'rgba(59, 130, 246, 0.3)'}
        polygonAltitude={(d: any) => d.properties.ISO_A2 === 'IN' ? 0.06 : 0.01}
      />
    </div>
  );
}
