import {useEffect, useMemo, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';

// One scene render plus one fullscreen pass. UI stays outside this pipeline so
// scanlines and switching distortion never affect text or hit targets.
const fragmentShader = /* glsl */`
  uniform sampler2D sceneTexture;
  uniform vec2 resolution;
  uniform float time;
  uniform float burst;
  uniform float motion;
  uniform float treatment;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    float row = floor(uv.y * 32.0);
    float tick = floor(time * 24.0);
    float tear = (hash(vec2(row,tick)) - .5) * burst * .09;
    uv.x = clamp(uv.x + tear, .001, .999);
    vec2 pixel = 1.0 / resolution;
    vec4 sample0 = texture2D(sceneTexture, uv);
    float split = burst * .016;
    vec3 objectColor = vec3(
      texture2D(sceneTexture,uv + vec2(split,0.)).r,
      sample0.g,
      texture2D(sceneTexture,uv - vec2(split,0.)).b);
    float mask = max(sample0.a, max(texture2D(sceneTexture,uv + vec2(split,0.)).a,
      texture2D(sceneTexture,uv - vec2(split,0.)).a));
    float halo = exp(-dot((vUv - vec2(.50,.53))*vec2(1.3,1.),
      (vUv - vec2(.50,.53))*vec2(1.3,1.)) * 5.0);
    vec3 background = mix(vec3(.055,.061,.056),vec3(.135,.145,.128),halo);
    // A calibrated graticule, drawn in the same shader as the phosphor display.
    vec2 cell = vUv * resolution / 64.;
    vec2 gridEdge = abs(fract(cell - .5) - .5) / max(fwidth(cell),vec2(.001));
    float grid = 1. - min(min(gridEdge.x,gridEdge.y),1.);
    background += vec3(.017,.026,.025) * grid;
    vec3 color = mix(background,objectColor,mask);
    vec3 glow = vec3(0.);
    glow += texture2D(sceneTexture,uv+vec2(pixel.x*2.,0.)).rgb;
    glow += texture2D(sceneTexture,uv-vec2(pixel.x*2.,0.)).rgb;
    glow += texture2D(sceneTexture,uv+vec2(0.,pixel.y*2.)).rgb;
    glow += texture2D(sceneTexture,uv-vec2(0.,pixel.y*2.)).rgb;
    color += glow * .018 * treatment;
    float raster = .965 + .035 * sin(vUv.y * resolution.y * 3.14159);
    color *= mix(1.,raster,treatment);
    float sweep = exp(-pow((vUv.y-fract(time*.10))/.026,2.));
    color += vec3(.012,.026,.021)*sweep*motion*treatment;
    color += (hash(gl_FragCoord.xy+tick)-.5)*.009*treatment;
    color += (hash(vec2(row,tick))-.5)*burst*.11;
    float vignette = 1.-.26*pow(length((vUv-.5)*1.45),2.);
    color *= vignette;
    gl_FragColor = vec4(max(color,vec3(0.)),1.);
    #include <colorspace_fragment>
  }
`;

export default function SignalDisplay({signal, readySignal, enabled=true}) {
  const {gl,size,scene,camera} = useThree();
  const switchedAt = useRef(-10);
  const reducedMotion = useRef(false);
  const pipeline = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
    const material = new THREE.ShaderMaterial({
      uniforms:{sceneTexture:{value:target.texture},resolution:{value:new THREE.Vector2(1,1)},
        time:{value:0},burst:{value:0},motion:{value:1},treatment:{value:1}},
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader, depthTest:false,depthWrite:false,toneMapped:false
    });
    const geometry = new THREE.PlaneGeometry(2,2);
    const output = new THREE.Scene();
    output.add(new THREE.Mesh(geometry,material));
    return {target,material,geometry,output,camera:new THREE.Camera()};
  },[]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {reducedMotion.current=preference.matches;};
    update(); preference.addEventListener('change',update);
    return () => preference.removeEventListener('change',update);
  },[]);
  useEffect(() => {switchedAt.current=performance.now()/1000;},[signal,readySignal]);
  useEffect(() => {
    const ratio=Math.min(gl.getPixelRatio(),1.5);
    pipeline.target.setSize(Math.max(1,Math.floor(size.width*ratio)),Math.max(1,Math.floor(size.height*ratio)));
    pipeline.material.uniforms.resolution.value.set(size.width*ratio,size.height*ratio);
  },[gl,size,pipeline]);
  useEffect(() => () => {
    pipeline.target.dispose(); pipeline.geometry.dispose(); pipeline.material.dispose();
  },[pipeline]);
  useFrame(() => {
    const now=performance.now()/1000;
    const uniforms=pipeline.material.uniforms;
    uniforms.time.value=now;
    uniforms.motion.value=reducedMotion.current?0:1;
    uniforms.treatment.value=enabled?1:0;
    uniforms.burst.value=enabled&&!reducedMotion.current?Math.pow(Math.max(0,1-(now-switchedAt.current)/.65),2):0;
    gl.setRenderTarget(pipeline.target);
    gl.setClearColor(0x000000,0);
    gl.clear();
    gl.render(scene,camera);
    gl.setRenderTarget(null);
    gl.render(pipeline.output,pipeline.camera);
  },1);
  return null;
}
