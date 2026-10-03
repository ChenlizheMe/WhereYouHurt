import React,{useEffect,useMemo,useState,useRef,useLayoutEffect,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {gsap} from 'gsap';
import {Canvas,useLoader,useThree} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import SignalDisplay from './SignalDisplay.jsx';
import './console.css';
import knowledge from '../data/knowledge.json';
import { cleanPartName, decodeName, safePartLabel } from './anatomyLabels.js';
import { clinicalProfile } from './clinicalRegions.js';

// Register the lightweight offline shell only in production builds.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(registration => {
      registration.update().catch(() => {});
    }).catch(() => {
      // Offline shell is an enhancement; the app remains usable without it.
    });
  });
}

const ANATOMY_ASSET_COMMIT='6f464dfec563352ea4eebd1219f4866a14e7dbf8';
// Keep the heavy GLBs and Draco decoder on the same origin as the app. This
// avoids a browser-only CORS/CDN failure when the nerve layer is selected.
const MODEL_ORIGIN='./anatomy/';
const MODEL_URLS={skeleton:`${MODEL_ORIGIN}skeletal_male.glb`,muscle:`${MODEL_ORIGIN}muscular_male.glb`,nerve:`${MODEL_ORIGIN}nervous_male.glb`};
const DRACO_DECODER_ORIGIN='./draco/';
const configureGLTF=loader=>{const draco=new DRACOLoader();draco.setDecoderPath(DRACO_DECODER_ORIGIN);loader.setDRACOLoader(draco)};
// Warm only the first-view skeleton in the background. It avoids a blocking boot
// screen while making the initial card appear as soon as the WebGL canvas is ready.
useLoader.preload(GLTFLoader,MODEL_URLS.skeleton,configureGLTF);
// Load only the active layer. Keeping all three GLBs in the loader cache at boot
// exhausts mobile WebGL memory before the user has selected a second layer.
const copy={zh:{slogan:'创伤小队',feelAction:'感觉',signsAction:'表现',diagnoseAction:'诊断',view:'查看',layer:'选择图层',parts:'点击疼痛部位',feel:'疼痛感觉',signs:'外部表现',result:'本地参考结果',loading:'加载解剖模型…',none:'请至少选择一个疼痛部位或标签',basis:'判断依据',advice:'日常建议',redFlags:'需要尽快就医的信号',disclaimer:'非专业医疗建议，仅为日常自我参考，不能替代医生诊断。如有严重或持续症状请及时就医。',disclaimerShort:'医疗提示：仅供参考，严重或持续症状请就医',medication:'非处方药教育信息',medicationIntro:'仅为一般类别说明；请阅读包装标签并咨询药师。这里不提供处方药建议或个体化剂量。',otcPain:'止痛类非处方药（如对乙酰氨基酚或布洛芬）可能用于短期轻微疼痛；按标签使用。',otcTopical:'局部非处方产品（如冷/热敷或外用止痛/止痒产品）可按标签短期使用；破损皮肤勿用外用产品。',medicationWarn:'有肝肾疾病、胃溃疡/出血、正在用药、怀孕/哺乳、对药物过敏或不确定是否适合时，先咨询药师或医生；出现严重反应立即停用并求助。',noPrescription:'不推荐处方药，也不提供个体化用药或剂量。'},en:{slogan:'TRAUMA TEAM',feelAction:'FEEL',signsAction:'SIGNS',diagnoseAction:'DIAGNOSE',view:'VIEW',layer:'LAYERS',parts:'CLICK A PAINFUL AREA',feel:'PAIN FEELINGS',signs:'VISIBLE SIGNS',result:'LOCAL REFERENCE',loading:'Loading anatomy…',none:'Select at least one body area or tag',basis:'Why it matched',advice:'Everyday advice',redFlags:'Seek care promptly for',disclaimer:'Not professional medical advice. For daily self-reference only. Cannot replace a doctor’s diagnosis. Seek medical help if severe or persistent.',disclaimerShort:'Medical note: reference only; seek care for severe or persistent symptoms',medication:'OTC medication education',medicationIntro:'General categories only; read the package label and ask a pharmacist. No prescription recommendations or individualized dosing.',otcPain:'OTC pain-relief categories (such as acetaminophen or ibuprofen) may help short-term minor pain; follow the label.',otcTopical:'OTC topical options (such as cold/heat packs or topical pain/itch products) may be used briefly as labeled; do not use topical products on broken skin.',medicationWarn:'If you have liver/kidney disease, ulcers or bleeding, take other medicines, are pregnant/breastfeeding, have allergies, or are unsure, ask a pharmacist or clinician first; stop and seek help for a serious reaction.',noPrescription:'No prescription medicines or individualized medication/dose recommendations.'}};
const layers=[['skeleton','骨骼','SKELETON'],['muscle','肌肉','MUSCLE'],['nerve','神经','NERVES']];
function semanticPartName(object){let current=object;while(current){const name=String(current.userData?.anatomyName||current.name||'').trim();if(name&&!/^mesh(?:[_-]|$)/i.test(name)&&!/^scene$/i.test(name))return name;current=current.parent}return ''}
function bilingualPartText(raw,layer,lang='zh'){const label=safePartLabel(raw,layer);return lang==='zh'?label.zh:label.en}
// The head/face batch uses explicit clinical topics so a model node such as
// “upper molar” can select the dental and nasal knowledge cards without exposing
// its raw mesh name. These are intentionally narrow aliases for this slice.
const PART_TOPIC_ALIASES=[
  ['tooth',['tooth','molar','premolar','incisor','canine','dental']],
  ['nose',['nasal','nose','sinus','concha','turbinate','septum','vomer']],
  ['head-neuro',['head','brain','cranial','trigeminal','optic','facial','cochlear','vestibular','vagus','cerebell','thalam','pons','medulla','midbrain','hypothalam','ventricle','eye','eyeball','cornea','retina','lens','lacrimal','ear','auditory','tympanic','olfactory','nasal']],
  ['jaw',['mandible','maxilla','jaw']],
  ['spine',['vertebra','spine','intervertebral','disc','sacrum','coccyx','cervical','thoracic','lumbar','neck','back']],
  ['neck-muscle',['neck','sternocleidomastoid','scalenus','splenius','semispinalis','longus capitis','longus colli','digastric','mylohyoid','geniohyoid','stylohyoid','platysma']],
  ['torso',['abdomen','abdominal','thoracolumbar','oblique','rectus','erector','quadratus','multifidus','intercostal','iliocostalis','longissimus','diaphragm','transversus thoracis']],
  ['abdomen',['abdomen','abdominal','rectus abdominis','oblique','transversus abdominis','linea alba','umbilical']],
  ['ribcage',['rib','sternum','costal','chest']],
  ['shoulder',['shoulder','clavicle','scapula','humerus','rotator','deltoid']],
  ['upper-limb',['arm','forearm','elbow','wrist','hand','radius','ulna','brachialis','brachioradialis','median nerve','ulnar nerve','radial nerve','axillary nerve','musculocutaneous nerve','brachial plexus']],
  ['hip',['hip','pelvis','femur','gluteus','iliacus','iliopsoas','psoas','piriformis']],
  ['knee',['knee','patella','popliteus']],
  ['ankle',['ankle','talus','calcaneus','malleolus','gastrocnemius','soleus']],
  ['foot',['foot','metatars','tarsal','cuneiform','navicular','cuboid','plantar','toe','phalanx','hallucis','fibularis']],
  ['lower-limb',['tibia','fibula','leg','thigh','calf','hamstring','sciatic','femoral','tibial','fibular','saphenous']]
];
function partTopics(raw,layer='muscle'){
  const value=cleanPartName(raw).toLowerCase();
  const rawValue=String(raw||'').toLowerCase();
  const profile=clinicalProfile(raw,layer);
  const topics=[value,profile.region,profile.tissue];
  for(const [topic,tokens] of PART_TOPIC_ALIASES){if(tokens.some(token=>value.includes(token)))topics.push(topic)}
  const side=/(?:^|[._\s-])(left|l)\s*$/.test(rawValue)?'left':/(?:^|[._\s-])(right|r)\s*$/.test(rawValue)?'right':'';
  if(side){
    [...topics].forEach(topic=>topics.push(`${topic}-${side}`));
    if(topics.includes('abdomen')||topics.includes('torso'))topics.push(`abdomen-${side}`);
  }
  if(topics.length===1)topics.push('general');
  return [...new Set(topics)];
}
// Measured from the three Anatria GLBs: all share this canonical anatomical box
// (Y≈0.857, height≈1.70). Keeping one world frame prevents layer swaps from
// changing camera scale or making the nervous layer collapse to the feet.
const CANONICAL_FRAME={center:[0,0.857,0.005],height:1.7};
function tagLabel(t,lang){return lang==='zh'?t.zh:t.en}
const INITIAL_ZOOM=3.8;
const MIN_ZOOM=1.3;
const MAX_ZOOM=24;
function CameraRig({orbit,lift,elevation,zoom}){const {camera}=useThree(); useEffect(()=>{const radius=(INITIAL_ZOOM*INITIAL_ZOOM)/Math.max(MIN_ZOOM,zoom); const theta=orbit*Math.PI/180; const phi=elevation*Math.PI/180; const baseTargetY=0; const horizontalRadius=Math.cos(phi)*radius; camera.position.set(Math.sin(theta)*horizontalRadius,baseTargetY+lift+Math.sin(phi)*radius,Math.cos(theta)*horizontalRadius); // Lift translates camera + target; elevation is the free two-axis orbit pitch.
 camera.lookAt(0,baseTargetY+lift,0); camera.updateProjectionMatrix()},[camera,orbit,lift,elevation,zoom]); return null}
function Model({layer,onPart,selectedObject,registerApproximatePick}){
  const {camera,gl}=useThree();
  const gltf=useLoader(GLTFLoader,MODEL_URLS[layer],configureGLTF);
  // Reuse cached geometry and shared base materials. Only the selected mesh
  // receives a temporary material, keeping memory use low during layer swaps.
  const root=useMemo(()=>{
    gltf.scene.traverse(object=>{
      const node=gltf.parser.associations.get(object)?.nodes;
      const original=node===undefined?null:gltf.parser.json.nodes[node]?.name;
      if(original)object.userData.anatomyName=decodeName(original);
    });
    return gltf.scene;
  },[gltf]);
  const groupRef=useRef();
  const clickRef=useRef(null);
  // Normalize every asset into the same centered, human-scale frame. The source GLBs
  // have very different origins/scales (some otherwise render as feet only).
  useLayoutEffect(()=>{
    if(!groupRef.current) return;
    // Do not derive scale from whichever layer happened to load last. The source
    // bounds were measured once and share the same origin; use one fixed frame.
    root.position.set(-CANONICAL_FRAME.center[0],-CANONICAL_FRAME.center[1],-CANONICAL_FRAME.center[2]);
    groupRef.current.scale.setScalar(1);
    groupRef.current.position.set(0,0,0);
  },[root]);
  const commitSelection=object=>{if(!object)return;onPart({part:meshPart({object}),object});};
  useEffect(()=>{
    if(!registerApproximatePick)return;
    const pickNearest=(event)=>{
      const rect=gl.domElement.getBoundingClientRect();
      const x=Number(event.clientX);const y=Number(event.clientY);
      if(!Number.isFinite(x)||!Number.isFinite(y)||!rect.width||!rect.height)return;
      const ndc=new THREE.Vector2(((x-rect.left)/rect.width)*2-1,-(((y-rect.top)/rect.height)*2-1));
      const raycaster=new THREE.Raycaster();raycaster.setFromCamera(ndc,camera);
      const rayHit=raycaster.intersectObject(root,true).find(hit=>hit.object?.isMesh&&hit.object.visible);
      if(rayHit){commitSelection(rayHit.object);return;}
      let nearest=null;
      root.updateWorldMatrix(true,true);
      root.traverse(object=>{
        if(!object.isMesh||!object.visible||!object.geometry)return;
        if(!object.geometry.boundingSphere)object.geometry.computeBoundingSphere();
        const sphere=object.geometry.boundingSphere?.clone();if(!sphere)return;
        sphere.applyMatrix4(object.matrixWorld);
        const projected=sphere.center.clone().project(camera);
        const cx=rect.left+(projected.x+1)*rect.width*.5;
        const cy=rect.top+(1-projected.y)*rect.height*.5;
        const distance=Math.hypot(x-cx,y-cy);
        const cameraDistance=camera.position.distanceTo(sphere.center);
        const fov=THREE.MathUtils.degToRad(camera.fov||38);
        const radiusPx=Math.max(8,(sphere.radius/Math.max(.01,cameraDistance))*rect.height/(2*Math.tan(fov/2)));
        const score=distance/(radiusPx+26);
        if(!nearest||score<nearest.score)nearest={object,score};
      });
      if(nearest&&nearest.score<1.15)commitSelection(nearest.object);
    };
    registerApproximatePick.current=pickNearest;
    return()=>{if(registerApproximatePick.current===pickNearest)registerApproximatePick.current=null;};
  },[camera,gl,root,registerApproximatePick,selectedObject,onPart]);
  useEffect(()=>{root.traverse(o=>{
    // Draco assets contain only triangle primitives. Hide line/point helpers defensively;
    // they are the source of the intermittent black contour flash in some WebGL drivers.
    if(o.isLine||o.isLineSegments||o.isPoints){o.visible=false;return}
    if(!o.isMesh)return;
    o.userData.part=semanticPartName(o)||'general';
    const materials=Array.isArray(o.material)?o.material:o.material?[o.material]:[];
    if(!materials.length)return;
    const hit=o===selectedObject;
    // GLB files often reuse one material across many meshes. Clone only the
    // selected mesh so its orange state cannot be overwritten by the next mesh
    // in the traversal, then restore the shared material when it is cleared.
    if(hit&&!o.userData.whereHurtMaterial){
      o.userData.originalMaterial=o.material;
      const cloned=materials.map(material=>material?.clone()).filter(Boolean);
      o.material=Array.isArray(o.material)?cloned:cloned[0];
      o.userData.whereHurtMaterial=true;
    }else if(!hit&&o.userData.whereHurtMaterial){
      const highlighted=o.material;
      o.material=o.userData.originalMaterial;
      (Array.isArray(highlighted)?highlighted:[highlighted]).forEach(material=>material?.dispose?.());
      delete o.userData.originalMaterial;
      delete o.userData.whereHurtMaterial;
    }
    const owned=Array.isArray(o.material)?o.material:[o.material];
    o.visible=true;
    o.frustumCulled=true;
    o.castShadow=false;
    o.receiveShadow=false;
    o.renderOrder=layer==='skeleton'?1:layer==='muscle'?2:3;
    owned.forEach(material=>{
      if(!material)return;
      material.color.set(hit?'#ff6338':layer==='skeleton'?'#d4c99d':layer==='muscle'?'#c96759':'#42d6a4');
      if(material.emissive){material.emissive.set(hit?'#ff2e00':'#000000');material.emissiveIntensity=hit?.65:0;}
      if('roughness' in material)material.roughness=.72;
      if('metalness' in material)material.metalness=.12;
      material.side=THREE.DoubleSide;
      material.depthTest=true;
      material.depthWrite=true;
      material.transparent=false;
      material.opacity=1;
      material.alphaTest=0;
      material.blending=THREE.NormalBlending;
      material.polygonOffset=false;
      if('flatShading' in material)material.flatShading=false;
      material.needsUpdate=true;
    });
  });},[root,layer,selectedObject]);
  useEffect(()=>()=>{root.traverse(o=>{if(!o.isMesh||!o.userData.whereHurtMaterial)return;const highlighted=o.material;o.material=o.userData.originalMaterial;(Array.isArray(highlighted)?highlighted:[highlighted]).forEach(material=>material?.dispose?.());delete o.userData.originalMaterial;delete o.userData.whereHurtMaterial;})},[root]);
  const meshPart=e=>e.object?.userData?.part||e.object?.name||'general';
  const onMeshPointerDown=e=>{if(e.button!==0||clickRef.current?.pointerId===e.pointerId)return;clickRef.current={pointerId:e.pointerId,part:meshPart(e),object:e.object||e.intersections?.[0]?.object||e.eventObject,x:e.clientX,y:e.clientY,startedAt:performance.now(),moved:false};};
  const onMeshPointerMove=e=>{const candidate=clickRef.current;if(!candidate||candidate.pointerId!==e.pointerId)return;const distance=Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y);if(distance>6)candidate.moved=true;};
  const onMeshPointerUp=e=>{const candidate=clickRef.current;if(!candidate||candidate.pointerId!==e.pointerId){clickRef.current=null;return;}const elapsed=performance.now()-candidate.startedAt;const distance=Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y);if(!candidate.moved&&elapsed<=520&&distance<=14)commitSelection(candidate.object);clickRef.current=null;};
  const onMeshPointerCancel=()=>{clickRef.current=null;};
  return <group ref={groupRef} onPointerDown={onMeshPointerDown} onPointerMove={onMeshPointerMove} onPointerUp={onMeshPointerUp} onPointerCancel={onMeshPointerCancel}><primitive object={root} onPointerDown={onMeshPointerDown} onPointerMove={onMeshPointerMove} onPointerUp={onMeshPointerUp} onPointerCancel={onMeshPointerCancel}/></group>;
}
class ModelErrorBoundary extends React.Component{state={error:null}; static getDerivedStateFromError(error){return {error};} componentDidUpdate(prev){if(prev.resetKey!==this.props.resetKey||prev.layer!==this.props.layer){if(this.state.error)this.setState({error:null});}} render(){return this.state.error?<div className="model-error" role="alert"><p>{this.props.layer==='nerve'?'神经模型加载失败，正在使用本地资源。':'Unable to load the anatomy model.'}</p><small>{this.state.error?.message||'Unknown loader error'}</small><button type="button" onClick={this.props.onRetry}>RETRY MODEL</button></div>:this.props.children;}}
class AppErrorBoundary extends React.Component{state={error:null}; static getDerivedStateFromError(error){return {error};} render(){return this.state.error?<main className="app-error" role="alert"><h1>TRAUMA TEAM</h1><p>The app encountered an unexpected error. Please reload the page.</p><details><summary>Technical details</summary><pre>{String(this.state.error?.message||this.state.error)}</pre></details></main>:this.props.children;}}
function App(){
 const [lang,setLang]=useState('zh'),[layer,setLayer]=useState('skeleton'),[orbit,setOrbit]=useState(0),[elevation,setElevation]=useState(0),[lift,setLift]=useState(0),[zoom,setZoom]=useState(INITIAL_ZOOM),[parts,setParts]=useState([]),[selectedObject,setSelectedObject]=useState(null),[feels,setFeels]=useState([]),[signs,setSigns]=useState([]),[sheet,setSheet]=useState(null),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[severity,setSeverity]=useState(5),[modelNonce,setModelNonce]=useState(0); const pinchRef=useRef(null); const liftDragRef=useRef(null); const drawerRef=useRef(null); const liftThumbRef=useRef(null); const motionRootRef=useRef(null); const inertiaFrameRef=useRef(null); const orbitVelocityRef=useRef({azimuth:0,elevation:0}); const zoomVelocityRef=useRef(0); const c=copy[lang];
 const chooseLayer=id=>{if(id===layer)return;setParts([]);setSelectedObject(null);setLayer(id)};
 const retryModel=()=>{useLoader.clear(GLTFLoader,MODEL_URLS[layer]);setModelNonce(value=>value+1)};
 useEffect(()=>{if(liftThumbRef.current)gsap.to(liftThumbRef.current,{bottom:`${Math.max(0,Math.min(89.5,((lift+.5)/1.6)*89.5))}%`,duration:.22,ease:'power2.out',overwrite:'auto'});},[lift]);
 useEffect(()=>{const root=motionRootRef.current;if(!root)return;const buttons=[...root.querySelectorAll('button')];const clean=[];buttons.forEach(btn=>{const enter=()=>gsap.to(btn,{y:-2,duration:.18,ease:'power2.out',overwrite:'auto'});const leave=()=>gsap.to(btn,{y:0,duration:.24,ease:'elastic.out(1,.55)',overwrite:'auto'});const down=()=>gsap.to(btn,{scale:.96,duration:.08,ease:'power2.out',overwrite:'auto'});const up=()=>gsap.to(btn,{scale:1,duration:.28,ease:'back.out(2)',overwrite:'auto'});btn.addEventListener('pointerenter',enter);btn.addEventListener('pointerleave',leave);btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);clean.push(()=>{btn.removeEventListener('pointerenter',enter);btn.removeEventListener('pointerleave',leave);btn.removeEventListener('pointerdown',down);btn.removeEventListener('pointerup',up)});});return()=>clean.forEach(fn=>fn())},[sheet,lang]);
 useEffect(()=>{if(sheet&&drawerRef.current)gsap.fromTo(drawerRef.current,{autoAlpha:0,y:24,scale:.96},{autoAlpha:1,y:0,scale:1,duration:.42,ease:'back.out(1.55)',overwrite:'auto'});},[sheet]);
 const toggle=(arr,set,v)=>set(arr.includes(v)?arr.filter(x=>x!==v):[...arr,v]);
 const displayWhy=w=>{if(parts.includes(w))return bilingualPartText(w,layer,lang);const tag=[...knowledge.feelings,...knowledge.signs].find(item=>item.id===w);return tag?tagLabel(tag,lang):w};
 const run=()=>{if(!parts.length&&!feels.length&&!signs.length){setResult({error:c.none});setSheet('diagnosis');return}setBusy(true);setSheet('diagnosis');setTimeout(()=>{const profiles=parts.map(part=>clinicalProfile(part,layer));const scored=knowledge.conditions.map(x=>{let score=0,why=[];for(const p of parts){const topics=partTopics(p,layer);const sideTopics=topics.filter(topic=>/(?:^|-)left$|(?:^|-)right$/.test(topic));const sideSpecific=x.parts.filter(topic=>/^abdomen-(?:left|right)$/.test(topic));const matched=sideSpecific.length?x.parts.find(topic=>sideTopics.includes(topic)):x.parts.find(topic=>topics.includes(topic));if(matched){score+=matched==='general'?1:3;why.push(p)}}for(const f of feels){if(x.feelings.includes(f)){score+=2;why.push(f)}}for(const z of signs){if(x.signs.includes(z)){score+=2;why.push(z)}}return {...x,score,why:[...new Set(why)]}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4);setResult({items:scored,profiles});setBusy(false)},320)};
 const approximatePickRef=useRef(null); const dragRef=useRef(null); const [viewerInteraction,setViewerInteraction]=useState('idle');
 const cancelInertia=()=>{if(inertiaFrameRef.current!==null){cancelAnimationFrame(inertiaFrameRef.current);inertiaFrameRef.current=null}orbitVelocityRef.current={azimuth:0,elevation:0};zoomVelocityRef.current=0};
 const startInertia=()=>{if(inertiaFrameRef.current!==null)return;const tick=()=>{let active=false;const orbitV=orbitVelocityRef.current;const zoomV=zoomVelocityRef.current;if(Math.abs(orbitV.azimuth)>.002||Math.abs(orbitV.elevation)>.002){setOrbit(v=>v+orbitV.azimuth);setElevation(v=>Math.max(-38,Math.min(38,v+orbitV.elevation)));orbitV.azimuth*=.9;orbitV.elevation*=.9;active=true}else{orbitV.azimuth=0;orbitV.elevation=0}if(Math.abs(zoomV)>.001){setZoom(v=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,v+zoomV)));zoomVelocityRef.current=zoomV*.84;active=true}else zoomVelocityRef.current=0;if(active)inertiaFrameRef.current=requestAnimationFrame(tick);else inertiaFrameRef.current=null};inertiaFrameRef.current=requestAnimationFrame(tick)};
 useEffect(()=>()=>cancelInertia(),[]);
 const isViewerControlTarget=target=>target?.closest?.('button,input,summary,details,.sticker-sheet,.medical-note,.vertical-control');
 const closeSheetFromOutside=target=>{if(!sheet)return;const insideDock=target?.closest?.('.sticker-dock');const insideSheet=target?.closest?.('.sticker-sheet');if(!insideDock&&!insideSheet)setSheet(null)};
 const onViewerWheel=e=>{if(isViewerControlTarget(e.target))return;const rawDelta=e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*window.innerHeight:e.deltaY;if(!Number.isFinite(rawDelta)||rawDelta===0)return;e.preventDefault();cancelInertia();const impulse=-rawDelta*.00125;zoomVelocityRef.current=Math.max(-1.2,Math.min(1.2,zoomVelocityRef.current+impulse*.42));setZoom(z=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,z*Math.exp(impulse))));startInertia()};
 const onViewerPointerDown=e=>{closeSheetFromOutside(e.target);cancelInertia();if(e.pointerType!=='mouse'||e.button!==0||isViewerControlTarget(e.target)){setViewerInteraction('idle');return}dragRef.current={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,vOrbit:0,vElevation:0,active:false};setViewerInteraction('press')};
 const onViewerPointerMove=e=>{const d=dragRef.current;if(!d||d.id!==e.pointerId)return;const distance=Math.hypot(e.clientX-d.startX,e.clientY-d.startY);if(!d.active){if(distance<8)return;d.active=true;d.x=e.clientX;d.y=e.clientY;e.currentTarget.setPointerCapture?.(e.pointerId);setViewerInteraction('drag');return}const dx=e.clientX-d.x,dy=e.clientY-d.y;d.x=e.clientX;d.y=e.clientY;d.vOrbit=d.vOrbit*.25-dx*.45*.75;d.vElevation=d.vElevation*.25+dy*.35*.75;setOrbit(v=>v-dx*.45);setElevation(v=>Math.max(-38,Math.min(38,v+dy*.35)))};
 const onViewerPointerEnd=e=>{const d=dragRef.current;if(!d||d.id!==e.pointerId)return;dragRef.current=null;setViewerInteraction('idle');if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(e.type!=='pointercancel'&&d.active){orbitVelocityRef.current={azimuth:d.vOrbit,elevation:d.vElevation};startInertia()}};
 const onViewerTouchStart=e=>{closeSheetFromOutside(e.target);cancelInertia();setViewerInteraction('press');if(isViewerControlTarget(e.target))return;if(e.touches.length===2){dragRef.current=null;const [a,b]=e.touches;pinchRef.current=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);return}if(e.touches.length===1&&!isViewerControlTarget(e.target))dragRef.current={id:'touch',x:e.touches[0].clientX,y:e.touches[0].clientY,vOrbit:0,vElevation:0,active:false}};
 const onViewerTouchMove=e=>{if(isViewerControlTarget(e.target))return;if(e.touches.length===2&&pinchRef.current){e.preventDefault();setViewerInteraction('drag');const [a,b]=e.touches;const distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);const delta=pinchRef.current-distance;zoomVelocityRef.current=Math.max(-1.2,Math.min(1.2,zoomVelocityRef.current-delta*.02));setZoom(z=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,z-delta*.04)));pinchRef.current=distance;return}if(e.touches.length===1&&dragRef.current?.id==='touch'){e.preventDefault();const d=dragRef.current,dx=e.touches[0].clientX-d.x,dy=e.touches[0].clientY-d.y;const distance=Math.hypot(e.touches[0].clientX-(d.startX??d.x),e.touches[0].clientY-(d.startY??d.y));if(!d.active){if(distance<8)return;d.active=true;setViewerInteraction('drag')}d.x=e.touches[0].clientX;d.y=e.touches[0].clientY;d.vOrbit=d.vOrbit*.25-dx*.45*.75;d.vElevation=d.vElevation*.25+dy*.35*.75;setOrbit(v=>v-dx*.45);setElevation(v=>Math.max(-38,Math.min(38,v+dy*.35)))} };
 const onViewerTouchEnd=e=>{if(e.touches.length<2)pinchRef.current=null;if(e.touches.length===0){if(dragRef.current){const d=dragRef.current;dragRef.current=null;if(d.active)orbitVelocityRef.current={azimuth:d.vOrbit,elevation:d.vElevation}}setViewerInteraction('idle');startInertia()}};
 const onLiftPointerDown=e=>{
   if(e.button!==0||liftDragRef.current)return;
   e.preventDefault();e.stopPropagation();cancelInertia();dragRef.current=null;pinchRef.current=null;
   liftDragRef.current={id:e.pointerId,startY:e.clientY,startLift:lift,moved:false};
   e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);
 };
 const onLiftPointerMove=e=>{
   const d=liftDragRef.current;if(!d||d.id!==e.pointerId)return;
   e.preventDefault();e.stopPropagation();const dy=e.clientY-d.startY;
   if(!d.moved&&Math.abs(dy)<4)return;d.moved=true;
   const travel=Math.max(1,e.currentTarget.getBoundingClientRect().height-18);
   setLift(Math.max(-.5,Math.min(1.1,d.startLift-dy*1.6/travel)));
 };
 const onLiftPointerEnd=e=>{
   if(liftDragRef.current?.id!==e.pointerId)return;
   e.stopPropagation();liftDragRef.current=null;
   if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 };
 const onLiftKeyDown=e=>{
   e.stopPropagation();const amount=e.shiftKey ? .08 : .01;let next=null;
   if(e.key==='ArrowUp'||e.key==='ArrowRight')next=lift+amount;
   if(e.key==='ArrowDown'||e.key==='ArrowLeft')next=lift-amount;
   if(e.key==='PageUp')next=lift+.2;if(e.key==='PageDown')next=lift-.2;
   if(e.key==='Home')next=-.5;if(e.key==='End')next=1.1;
   if(next!==null){e.preventDefault();setLift(Math.max(-.5,Math.min(1.1,next)))}
 };
 // Keep the drawer's native scrolling and button actions, but never route its
 // gestures to the scene. Clear any interrupted orbit/pinch when it is used.
 const stopPanelGesture=e=>{e.stopPropagation();dragRef.current=null;pinchRef.current=null};
 const resetView=()=>{cancelInertia();setOrbit(0);setElevation(0);setLift(0);setZoom(INITIAL_ZOOM);setLayer('skeleton');setParts([]);setSelectedObject(null);setSheet(null)};
 return <div ref={motionRootRef} className="app"><main><section className="console single-view"><section className={`viewer ${viewerInteraction==='drag'?'drag-active':viewerInteraction==='press'?'press-active':''}`} aria-label="Interactive 3D anatomy model" onPointerDown={onViewerPointerDown} onPointerMove={onViewerPointerMove} onPointerUp={onViewerPointerEnd} onPointerCancel={onViewerPointerEnd} onTouchStart={onViewerTouchStart} onTouchMove={onViewerTouchMove} onTouchEnd={onViewerTouchEnd} onWheel={onViewerWheel}><div className="screen-label"><strong>{c.slogan}</strong><span className="screen-status">{lang==='zh'?'解剖 // 实时':'ANATOMY // LIVE'}</span><span className="led"/></div><div className="scene-tools"><div className="scene-controls"><button aria-label="Switch language" onClick={()=>setLang(lang==='zh'?'en':'zh')}>{lang==='zh'?'EN':'中'}</button><button className="reset-control" aria-label="Reset view" onClick={resetView}>RESET</button></div><div className="model-layers" aria-label="Anatomy layer picker">{layers.map(([id,zh,icon])=><button key={id} aria-label={lang==='zh'?zh:icon} className={layer===id?'layer-dot active':'layer-dot'} onClick={()=>chooseLayer(id)}><span className="layer-icon">{id==='skeleton'?'▦':id==='muscle'?'◉':'⌁'}</span><span className="layer-name">{lang==='zh'?zh:icon}</span></button>)}</div>{parts.length>0&&<div className="part-selection" aria-live="polite" aria-label={lang==='zh'?'已选解剖结构':'Selected anatomy structure'}><b>{lang==='zh'?safePartLabel(parts[0],layer).zh:safePartLabel(parts[0],layer).en}</b></div>}</div><div className="crt-overlay" aria-hidden="true"><span className="crt-noise"/><span className="crt-scanlines"/><span className="crt-vignette"/><span className="crt-chroma"/><span className="crt-grain"/><div className="particles">{Array.from({length:8},(_,i)=><i key={i} style={{'--i':i}}/>)}</div></div><ModelErrorBoundary key={`${layer}-${modelNonce}`} layer={layer} resetKey={modelNonce} onRetry={retryModel}><Canvas className="anatomy-canvas" onPointerMissed={event=>approximatePickRef.current?.(event)} fallback={<div className="model-error" role="alert"><p>3D preview is unavailable in this browser.</p><button type="button" onClick={retryModel}>RETRY VIEWER</button></div>} camera={{position:[0,0,3.8],fov:38}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.NoToneMapping;gl.shadowMap.enabled=false;}} dpr={[1,1.5]}><color attach="background" args={['#292c29']}/><ambientLight intensity={1.5}/><directionalLight position={[2,3,4]} intensity={2}/><Suspense fallback={<Html center className="model-loading">{c.loading}</Html>}><Model layer={layer} onPart={({part,object})=>{const deselect=selectedObject===object;setSelectedObject(deselect?null:object);setParts(deselect?[]:[part])}} selectedObject={selectedObject} registerApproximatePick={approximatePickRef}/></Suspense><CameraRig orbit={orbit} lift={lift} elevation={elevation} zoom={zoom}/><SignalDisplay signal={layer} readySignal={modelNonce}/></Canvas></ModelErrorBoundary><div className="vertical-control" onTouchStart={stopPanelGesture} onTouchMove={stopPanelGesture} onTouchEnd={stopPanelGesture} onWheel={stopPanelGesture}><div className="vertical-track" role="slider" tabIndex={0} aria-label={lang==='zh'?'摄像机上下平移':'Vertical camera translation'} aria-orientation="vertical" aria-valuemin={-.5} aria-valuemax={1.1} aria-valuenow={Number(lift.toFixed(2))} title={lang==='zh'?'按住后上下拖动':'Press and drag vertically'} onPointerDown={onLiftPointerDown} onPointerMove={onLiftPointerMove} onPointerUp={onLiftPointerEnd} onPointerCancel={onLiftPointerEnd} onLostPointerCapture={onLiftPointerEnd} onKeyDown={onLiftKeyDown} onClick={e=>{e.preventDefault();e.stopPropagation()}}><span ref={liftThumbRef} className="lift-thumb" aria-hidden="true" style={{bottom:`${Math.max(0,Math.min(89.5,((lift+.5)/1.6)*89.5))}%`}}/></div></div><div className="sticker-dock" aria-label="Quick actions"><button className={sheet==='feelings'?'sticker-card active':'sticker-card'} onClick={()=>setSheet('feelings')}>{c.feelAction} <span>{feels.length||'+'}</span></button><button className={sheet==='signs'?'sticker-card active':'sticker-card'} onClick={()=>setSheet('signs')}>{c.signsAction} <span>{signs.length||'+'}</span></button><button className={sheet==='diagnosis'?'sticker-card active diagnosis':'sticker-card diagnosis'} onClick={run}>{busy?'…':c.diagnoseAction} <span>↗</span></button></div><details className="medical-note"><summary>⚠ {c.disclaimerShort}</summary><div>{c.disclaimer}</div></details>{sheet&&sheet!=='diagnosis'&&<div ref={drawerRef} className="sticker-sheet" role="dialog" aria-label={sheet==='feelings'?c.feel:c.signs} onPointerDown={stopPanelGesture} onPointerMove={stopPanelGesture} onPointerUp={stopPanelGesture} onPointerCancel={stopPanelGesture} onTouchStart={stopPanelGesture} onTouchMove={stopPanelGesture} onTouchEnd={stopPanelGesture} onTouchCancel={stopPanelGesture} onWheel={stopPanelGesture}><div className="sheet-head"><b>{sheet==='feelings'?c.feel:c.signs}</b><button onClick={()=>setSheet(null)} aria-label="Close">×</button></div>{sheet==='feelings'&&<div className="severity-control"><div className="severity-meta"><span>{lang==='zh'?'疼痛强度':'PAIN INTENSITY'}</span><output>{severity}/10 · {severity<=2?(lang==='zh'?'轻微':'MILD'):severity<=5?(lang==='zh'?'中等':'MODERATE'):severity<=8?(lang==='zh'?'明显':'HIGH'):(lang==='zh'?'剧烈':'SEVERE')}</output></div><input aria-label={lang==='zh'?'疼痛强度':'Pain intensity'} type="range" min="0" max="10" step="1" value={severity} onChange={e=>setSeverity(Number(e.target.value))}/></div>}<div className="sticker-grid">{(sheet==='feelings'?knowledge.feelings:knowledge.signs).map(t=>{const selected=(sheet==='feelings'?feels:signs).includes(t.id);return <button key={t.id} className={selected?'sheet-sticker selected':'sheet-sticker'} onClick={()=>sheet==='feelings'?toggle(feels,setFeels,t.id):toggle(signs,setSigns,t.id)}>{tagLabel(t,lang)}</button>})}</div></div>}{sheet==='diagnosis'&&result&&<div ref={drawerRef} className="sticker-sheet diagnosis-sheet" role="dialog" aria-label={c.result} onPointerDown={stopPanelGesture} onPointerMove={stopPanelGesture} onPointerUp={stopPanelGesture} onPointerCancel={stopPanelGesture} onTouchStart={stopPanelGesture} onTouchMove={stopPanelGesture} onTouchEnd={stopPanelGesture} onTouchCancel={stopPanelGesture} onWheel={stopPanelGesture}><div className="sheet-head"><b>{c.result}</b><button onClick={()=>setSheet(null)} aria-label="Close">×</button></div>{result.error?<p className="error">{result.error}</p>:result.items.length?<><div className="clinical-profiles">{(result.profiles||[]).map(profile=><div className="clinical-profile" key={`${profile.name}-${profile.region}`}><strong>{lang==='zh'?profile.title.zh:profile.title.en}</strong><p>{lang==='zh'?profile.summary:profile.summaryEn}</p><small>{lang==='zh'?profile.question:profile.questionEn}</small></div>)}</div><div className="cards">{result.items.map((x,i)=><article className="card" key={x.id}><div className="rank">0{i+1}</div><div className="condition">{lang==='zh'?x.name.zh:x.name.en}</div>{(x.summary||x.summaryEn)&&<p className="condition-summary">{lang==='zh'?x.summary:x.summaryEn}</p>}<div className="line"><b>{c.basis}</b> {x.why.map(w=><span key={w}>{displayWhy(w)}</span>)}</div><div className="advice"><b>{c.advice}</b><br/>{lang==='zh'?x.advice.zh:x.advice.en}</div>{x.redFlags&&<div className="red-flags"><b>{c.redFlags}</b><br/>{lang==='zh'?x.redFlags.zh:x.redFlags.en}</div>}{x.medication&&<div className="medication-info"><b>{c.medication}</b><br/>{lang==='zh'?x.medication.zh:x.medication.en}</div>}</article>)}</div></>:<p className="error">{c.none}</p>}</div>}</section></section></main></div>}
createRoot(document.getElementById('root')).render(<AppErrorBoundary><App/></AppErrorBoundary>);
