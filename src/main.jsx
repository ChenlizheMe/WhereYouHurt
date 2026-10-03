import React,{useEffect,useMemo,useState,useRef,useLayoutEffect,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {gsap} from 'gsap';
import {Canvas,useLoader,useThree} from '@react-three/fiber';
import {Loader,Html} from '@react-three/drei';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import './styles.css';
import knowledge from '../data/knowledge.json';

// Register the lightweight offline shell only in production builds.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      // Offline shell is an enhancement; the app remains usable without it.
    });
  });
}

const ANATOMY_ASSET_COMMIT='6f464dfec563352ea4eebd1219f4866a14e7dbf8';
const MODEL_ORIGIN=`https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@${ANATOMY_ASSET_COMMIT}/public/anatomy/`;
const MODEL_URLS={skeleton:`${MODEL_ORIGIN}skeletal_male.glb`,muscle:`${MODEL_ORIGIN}muscular_male.glb`,nerve:`${MODEL_ORIGIN}nervous_male.glb`};
const DRACO_DECODER_ORIGIN='https://cdn.jsdelivr.net/gh/mrdoob/three.js@r169/examples/jsm/libs/draco/';
const configureGLTF=loader=>{const draco=new DRACOLoader();draco.setDecoderPath(DRACO_DECODER_ORIGIN);loader.setDRACOLoader(draco)};
// Models stay lazy: only the active layer enters the loader cache until the user switches layers.
const copy={zh:{slogan:'您哪疼？',view:'查看',layer:'选择图层',parts:'点击疼痛部位',feel:'疼痛感觉',signs:'外部表现',result:'本地参考结果',loading:'加载解剖模型…',none:'请至少选择一个疼痛部位或标签',basis:'判断依据',advice:'日常建议',structures:'可能涉及结构',disclaimer:'非专业医疗建议，仅用于日常自我参考，不能替代医生诊断。如有严重或持续症状请及时就医。',disclaimerShort:'医疗提示：仅供参考，严重或持续症状请就医',medication:'非处方药教育信息',medicationIntro:'仅为一般类别说明；请阅读包装标签并咨询药师。这里不提供处方药建议或个体化剂量。',otcPain:'止痛类非处方药（如对乙酰氨基酚或布洛芬）可能用于短期轻微疼痛；按标签使用。',otcTopical:'局部非处方产品（如冷/热敷或外用止痛/止痒产品）可按标签短期使用；破损皮肤勿用外用产品。',medicationWarn:'有肝肾疾病、胃溃疡/出血、正在用药、怀孕/哺乳、对药物过敏或不确定是否适合时，先咨询药师或医生；出现严重反应立即停用并求助。',noPrescription:'不推荐处方药，也不提供个体化用药或剂量。'},en:{slogan:'WhereYouHurt',view:'VIEW',layer:'LAYERS',parts:'CLICK A PAINFUL AREA',feel:'PAIN FEELINGS',signs:'VISIBLE SIGNS',result:'LOCAL REFERENCE',loading:'Loading anatomy…',none:'Select at least one body area or tag',basis:'Why it matched',advice:'Everyday advice',structures:'Likely structures',disclaimer:'Not professional medical advice. For daily self-reference only. Cannot replace a doctor’s diagnosis. Seek medical help if severe or persistent.',disclaimerShort:'Medical note: reference only; seek care for severe or persistent symptoms',medication:'OTC medication education',medicationIntro:'General categories only; read the package label and ask a pharmacist. No prescription recommendations or individualized dosing.',otcPain:'OTC pain-relief categories (such as acetaminophen or ibuprofen) may help short-term minor pain; follow the label.',otcTopical:'OTC topical options (such as cold/heat packs or topical pain/itch products) may be used briefly as labeled; do not use topical products on broken skin.',medicationWarn:'If you have liver/kidney disease, ulcers or bleeding, take other medicines, are pregnant/breastfeeding, have allergies, or are unsure, ask a pharmacist or clinician first; stop and seek help for a serious reaction.',noPrescription:'No prescription medicines or individualized medication/dose recommendations.'}};
const layers=[['skeleton','骨骼','SKELETON'],['muscle','肌肉','MUSCLE'],['nerve','神经','NERVES']];
// GLB nodes use established anatomical English semantics (not stable IDs). Keep the
// visible label human-readable by stripping side/index suffixes and translating the
// semantic terms we encounter in the skeleton/muscle atlases.
const PART_PHRASES=[['pectoralis major muscle','胸大肌'],['pectoralis minor muscle','胸小肌'],['gluteus maximus','臀大肌'],['gluteus medius','臀中肌'],['trapezius muscle','斜方肌'],['deltoid muscle','三角肌'],['biceps brachii','肱二头肌'],['triceps brachii','肱三头肌'],['rectus abdominis','腹直肌'],['sternocleidomastoid','胸锁乳突肌'],['tibialis anterior','胫骨前肌'],['gastrocnemius','腓肠肌'],['quadriceps femoris','股四头肌'],['hamstring','腘绳肌']];
const PART_TERMS={bone:'骨',bones:'骨',muscle:'肌肉',muscles:'肌肉',nerve:'神经',nerves:'神经',ligament:'韧带',ligaments:'韧带',tendon:'肌腱',tendons:'肌腱',cartilage:'软骨',joint:'关节',joints:'关节',bursa:'滑囊',fascia:'筋膜',sheath:'鞘',retinaculum:'支持带',disc:'椎间盘',vertebra:'椎骨',vertebrae:'椎骨',sternum:'胸骨',rib:'肋骨',ribs:'肋骨',clavicle:'锁骨',scapula:'肩胛骨',femur:'股骨',tibia:'胫骨',fibula:'腓骨',humerus:'肱骨',radius:'桡骨',ulna:'尺骨',patella:'髌骨',calcaneus:'跟骨',skull:'颅骨',head:'头部',neck:'颈部',shoulder:'肩部',arm:'上肢',forearm:'前臂',hand:'手',finger:'手指',thumb:'拇指',chest:'胸部',thoracic:'胸部',abdominal:'腹部',abdomen:'腹部',back:'背部',spine:'脊柱',lumbar:'腰部',pelvic:'骨盆',hip:'髋部',thigh:'大腿',leg:'下肢',knee:'膝部',ankle:'踝部',foot:'足部',toe:'脚趾',anterior:'前',posterior:'后',superior:'上',inferior:'下',medial:'内侧',lateral:'外侧',proximal:'近端',distal:'远端',middle:'中部',body:'体部',part:'部',branch:'分支',branches:'分支',process:'突',flexor:'屈肌',extensor:'伸肌',adductor:'内收肌',abductor:'外展肌',rotator:'旋肌',sulcus:'沟',gyrus:'回',nucleus:'核',plexus:'丛',artery:'动脉',vein:'静脉',skin:'皮肤',gland:'腺体'};
function cleanPartName(raw){return String(raw||'').replace(/[._-](?:left|right|l|r|ol|or)$/i,'').replace(/\b(?:left|right|ol|or|l|r)\b/gi,'').replace(/\b\d+\b/g,'').replace(/[()]/g,'').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim()}
function partLabel(raw,layer){
  const cleaned=cleanPartName(raw);
  if(!cleaned||/^general$/i.test(cleaned)||/^mesh/i.test(cleaned))return layer==='skeleton'?{zh:'骨骼结构',en:'Skeletal structure'}:layer==='muscle'?{zh:'肌肉组织',en:'Muscle tissue'}:{zh:'神经结构',en:'Nerve structure'};
  let zh=cleaned;
  PART_PHRASES.forEach(([phrase,translation])=>{zh=zh.replace(new RegExp(phrase,'ig'),translation)});
  zh=zh.split(' ').map(token=>PART_TERMS[token.toLowerCase()]||token).filter(token=>!['of','the','and'].includes(token.toLowerCase())).join(' ');
  if(!/[\u3400-\u9fff]/.test(zh))zh=`解剖结构 · ${zh}`;
  return {zh:zh.trim(),en:cleaned};
}
function bilingualPartText(raw,layer){const label=partLabel(raw,layer);return `${label.zh} / ${label.en}`}
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
function Model({layer,onPart,selected}){
  const gltf=useLoader(GLTFLoader,MODEL_URLS[layer],configureGLTF);
  const root=useMemo(()=>gltf.scene.clone(true),[gltf]);
  const groupRef=useRef();
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
  useEffect(()=>{root.traverse(o=>{
    // Draco assets contain only triangle primitives. Hide line/point helpers defensively;
    // they are the source of the intermittent black contour flash in some WebGL drivers.
    if(o.isLine||o.isLineSegments||o.isPoints){o.visible=false;return}
    if(!o.isMesh)return;
    o.userData.part=o.userData.part||o.name||'general';
    const materials=Array.isArray(o.material)?o.material:o.material?[o.material]:[];
    if(!materials.length)return;
    if(!o.userData.whereHurtMaterial){
      o.material=Array.isArray(o.material)?o.material.map(material=>material.clone()):o.material.clone();
      o.userData.whereHurtMaterial=true;
    }
    const owned=Array.isArray(o.material)?o.material:[o.material];
    const hit=selected.some(p=>o.userData.part.toLowerCase().includes(p.toLowerCase()));
    o.castShadow=false;
    o.receiveShadow=false;
    o.renderOrder=layer==='skeleton'?1:layer==='muscle'?2:3;
    owned.forEach(material=>{
      if(!material)return;
      material.color.set(hit?'#ff6338':layer==='skeleton'?'#d4c99d':layer==='muscle'?'#c96759':'#42d6a4');
      material.emissive.set(hit?'#ff2e00':'#000000');
      material.emissiveIntensity=hit?.65:0;
      material.roughness=.72;
      material.metalness=.12;
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
  });},[root,layer,selected]);
  useEffect(()=>()=>{root.traverse(o=>{if(o.isMesh&&o.userData.whereHurtMaterial){o.material.dispose();delete o.userData.whereHurtMaterial;}})},[root]);
  return <group ref={groupRef}><primitive object={root} onPointerDown={e=>{e.stopPropagation();onPart(e.object.userData.part||e.object.name||'general')}}/></group>;
}
class ModelErrorBoundary extends React.Component{state={error:null}; static getDerivedStateFromError(error){return {error};} componentDidUpdate(prev){if(prev.layer!==this.props.layer&&this.state.error)this.setState({error:null});} render(){return this.state.error?<div className="model-error" role="alert">Unable to load the anatomy model. Try another layer or reload the page. {this.state.error?.message||'Unknown loader error'}</div>:this.props.children;}}
class AppErrorBoundary extends React.Component{state={error:null}; static getDerivedStateFromError(error){return {error};} render(){return this.state.error?<main className="app-error" role="alert"><h1>WhereYouHurt</h1><p>The app encountered an unexpected error. Please reload the page.</p><details><summary>Technical details</summary><pre>{String(this.state.error?.message||this.state.error)}</pre></details></main>:this.props.children;}}
function App(){
 const [lang,setLang]=useState('zh'),[layer,setLayer]=useState('skeleton'),[orbit,setOrbit]=useState(0),[elevation,setElevation]=useState(0),[lift,setLift]=useState(0),[zoom,setZoom]=useState(INITIAL_ZOOM),[parts,setParts]=useState([]),[feels,setFeels]=useState([]),[signs,setSigns]=useState([]),[sheet,setSheet]=useState(null),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[booting,setBooting]=useState(true),[severity,setSeverity]=useState(5); const pinchRef=useRef(null); const liftDragRef=useRef(null); const drawerRef=useRef(null); const liftThumbRef=useRef(null); const motionRootRef=useRef(null); const c=copy[lang];
 useEffect(()=>{const timer=setTimeout(()=>setBooting(false),900);return()=>clearTimeout(timer)},[]);
 const chooseLayer=id=>{if(id===layer)return;setLayer(id)};
 useEffect(()=>{if(liftThumbRef.current)gsap.to(liftThumbRef.current,{bottom:`${Math.max(0,Math.min(89.5,((lift+.5)/1.6)*89.5))}%`,duration:.22,ease:'power2.out',overwrite:'auto'});},[lift]);
 useEffect(()=>{const root=motionRootRef.current;if(!root)return;const buttons=[...root.querySelectorAll('button')];const clean=[];buttons.forEach(btn=>{const enter=()=>gsap.to(btn,{y:-2,duration:.18,ease:'power2.out',overwrite:'auto'});const leave=()=>gsap.to(btn,{y:0,duration:.24,ease:'elastic.out(1,.55)',overwrite:'auto'});const down=()=>gsap.to(btn,{scale:.96,duration:.08,ease:'power2.out',overwrite:'auto'});const up=()=>gsap.to(btn,{scale:1,duration:.28,ease:'back.out(2)',overwrite:'auto'});btn.addEventListener('pointerenter',enter);btn.addEventListener('pointerleave',leave);btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);clean.push(()=>{btn.removeEventListener('pointerenter',enter);btn.removeEventListener('pointerleave',leave);btn.removeEventListener('pointerdown',down);btn.removeEventListener('pointerup',up)});});return()=>clean.forEach(fn=>fn())},[sheet,lang]);
 useEffect(()=>{if(sheet&&drawerRef.current)gsap.fromTo(drawerRef.current,{autoAlpha:0,y:24,scale:.96},{autoAlpha:1,y:0,scale:1,duration:.42,ease:'back.out(1.55)',overwrite:'auto'});},[sheet]);
 const toggle=(arr,set,v)=>set(arr.includes(v)?arr.filter(x=>x!==v):[...arr,v]);
 const run=()=>{if(!parts.length&&!feels.length&&!signs.length){setResult({error:c.none});setSheet('diagnosis');return}setBusy(true);setSheet('diagnosis');setTimeout(()=>{const scored=knowledge.conditions.map(x=>{let score=0,why=[];for(const p of parts){if(x.parts.includes(p)){score+=3;why.push(p)}}for(const f of feels){if(x.feelings.includes(f)){score+=2;why.push(f)}}for(const z of signs){if(x.signs.includes(z)){score+=2;why.push(z)}}return {...x,score,why:[...new Set(why)]}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);setResult({items:scored});setBusy(false)},320)};
 const dragRef=useRef(null);
 const isViewerControlTarget=target=>target?.closest?.('button,input,summary,details,.sticker-sheet,.medical-note,.vertical-control');
 const onViewerWheel=e=>{if(isViewerControlTarget(e.target))return;const rawDelta=e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*window.innerHeight:e.deltaY;if(!Number.isFinite(rawDelta)||rawDelta===0)return;e.preventDefault();setZoom(z=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,z*Math.exp(-rawDelta*0.00125))))};
 const onViewerPointerDown=e=>{if(e.pointerType!=='mouse'||e.button!==0||isViewerControlTarget(e.target))return;dragRef.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture?.(e.pointerId)};
 const onViewerPointerMove=e=>{const d=dragRef.current;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;d.x=e.clientX;d.y=e.clientY;setOrbit(v=>Math.max(-180,Math.min(180,v-dx*.45)));setElevation(v=>Math.max(-38,Math.min(38,v+dy*.35)))};
 const onViewerPointerEnd=e=>{if(dragRef.current?.id===e.pointerId)dragRef.current=null};
 const onViewerTouchStart=e=>{if(isViewerControlTarget(e.target))return;if(e.touches.length===2){dragRef.current=null;const [a,b]=e.touches;pinchRef.current=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);return}if(e.touches.length===1&&!isViewerControlTarget(e.target))dragRef.current={id:'touch',x:e.touches[0].clientX,y:e.touches[0].clientY}};
 const onViewerTouchMove=e=>{if(isViewerControlTarget(e.target))return;if(e.touches.length===2&&pinchRef.current){e.preventDefault();const [a,b]=e.touches;const distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);const delta=pinchRef.current-distance;setZoom(z=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,z-delta*0.04)));pinchRef.current=distance;return}if(e.touches.length===1&&dragRef.current?.id==='touch'){e.preventDefault();const dx=e.touches[0].clientX-dragRef.current.x,dy=e.touches[0].clientY-dragRef.current.y;dragRef.current.x=e.touches[0].clientX;dragRef.current.y=e.touches[0].clientY;setOrbit(v=>Math.max(-180,Math.min(180,v-dx*.45)));setElevation(v=>Math.max(-38,Math.min(38,v+dy*.35)))}};
 const onViewerTouchEnd=e=>{if(e.touches.length<2)pinchRef.current=null;if(e.touches.length===0)dragRef.current=null};
 const onLiftPointerDown=e=>{
   if(e.button!==0||liftDragRef.current)return;
   e.preventDefault();e.stopPropagation();dragRef.current=null;pinchRef.current=null;
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
 const resetView=()=>{setOrbit(0);setElevation(0);setLift(0);setZoom(INITIAL_ZOOM);setLayer('skeleton');setParts([]);setSheet(null)};
 return <div ref={motionRootRef} className="app"><main><section className="console single-view"><section className="viewer" aria-label="Interactive 3D anatomy model" onPointerDown={onViewerPointerDown} onPointerMove={onViewerPointerMove} onPointerUp={onViewerPointerEnd} onPointerCancel={onViewerPointerEnd} onTouchStart={onViewerTouchStart} onTouchMove={onViewerTouchMove} onTouchEnd={onViewerTouchEnd} onWheel={onViewerWheel}><div className="screen-label"><strong>{c.slogan}</strong><span>ANATOMY // LIVE</span><span className="led"/></div><div className="scene-tools"><div className="scene-controls"><button aria-label="Switch language" onClick={()=>setLang(lang==='zh'?'en':'zh')}>{lang==='zh'?'EN':'中'}</button><button className="reset-control" aria-label="Reset view" onClick={resetView}>RESET</button></div><div className="model-layers" aria-label="Anatomy layer picker">{layers.map(([id,zh,icon])=><button key={id} aria-label={`${zh} / ${icon}`} className={layer===id?'layer-dot active':'layer-dot'} onClick={()=>chooseLayer(id)}><span className="layer-icon">{id==='skeleton'?'▦':id==='muscle'?'◉':'⌁'}</span><span className="layer-name"><b>{zh}</b><small>{icon}</small></span></button>)}</div><div className="part-selection" aria-live="polite" aria-label={lang==='zh'?'已选解剖部位':'Selected anatomy parts'}><div className="part-selection-head">{lang==='zh'?'部位映射':'PART MAP'} <span>// {layer.toUpperCase()}</span></div>{parts.length?parts.slice(0,3).map(part=><div className="part-selection-item" key={part}><b>{partLabel(part,layer).zh}</b><span>{partLabel(part,layer).en}</span></div>):<div className="part-selection-empty">{lang==='zh'?'点击模型选择部位':'Select a model part'}</div>}</div></div><div className="crt-overlay" aria-hidden="true"><span className="crt-noise"/><span className="crt-scanlines"/><span className="crt-vignette"/><span className="crt-chroma"/><span className="crt-grain"/><div className="telemetry"><span>REC // LOCAL</span><span>FPS 60</span></div><div className="particles">{Array.from({length:8},(_,i)=><i key={i} style={{'--i':i}}/>)}</div></div><ModelErrorBoundary layer={layer}><Canvas className="anatomy-canvas" fallback={<div className="model-error" role="alert">3D preview is unavailable in this browser.</div>} camera={{position:[0,0,3.8],fov:38}} dpr={[1,1.5]}><color attach="background" args={['#171916']}/><ambientLight intensity={1.5}/><directionalLight position={[2,3,4]} intensity={2}/><Suspense fallback={<Html center className="model-loading">{c.loading}</Html>}><Model layer={layer} onPart={p=>setParts(prev=>prev[0]===p?[]:[p])} selected={parts}/></Suspense><CameraRig orbit={orbit} lift={lift} elevation={elevation} zoom={zoom}/></Canvas></ModelErrorBoundary><div className="vertical-control" onTouchStart={stopPanelGesture} onTouchMove={stopPanelGesture} onTouchEnd={stopPanelGesture} onWheel={stopPanelGesture}><div className="vertical-track" role="slider" tabIndex={0} aria-label={lang==='zh'?'摄像机上下平移':'Vertical camera translation'} aria-orientation="vertical" aria-valuemin={-.5} aria-valuemax={1.1} aria-valuenow={Number(lift.toFixed(2))} title={lang==='zh'?'按住后上下拖动':'Press and drag vertically'} onPointerDown={onLiftPointerDown} onPointerMove={onLiftPointerMove} onPointerUp={onLiftPointerEnd} onPointerCancel={onLiftPointerEnd} onLostPointerCapture={onLiftPointerEnd} onKeyDown={onLiftKeyDown} onClick={e=>{e.preventDefault();e.stopPropagation()}}><span ref={liftThumbRef} className="lift-thumb" aria-hidden="true" style={{bottom:`${Math.max(0,Math.min(89.5,((lift+.5)/1.6)*89.5))}%`}}/></div></div><div className="sticker-dock" aria-label="Quick actions"><button className={sheet==='feelings'?'sticker-card active':'sticker-card'} onClick={()=>setSheet('feelings')}>FEEL <span>{feels.length||'+'}</span></button><button className={sheet==='signs'?'sticker-card active':'sticker-card'} onClick={()=>setSheet('signs')}>SIGNS <span>{signs.length||'+'}</span></button><button className={sheet==='diagnosis'?'sticker-card active diagnosis':'sticker-card diagnosis'} onClick={run}>{busy?'…':'DIAGNOSE'} <span>↗</span></button></div><details className="medical-note"><summary>⚠ {c.disclaimerShort}</summary><div>{c.disclaimer}</div></details>{sheet&&sheet!=='diagnosis'&&<div ref={drawerRef} className="sticker-sheet" role="dialog" aria-label={sheet==='feelings'?c.feel:c.signs} onPointerDown={stopPanelGesture} onPointerMove={stopPanelGesture} onPointerUp={stopPanelGesture} onPointerCancel={stopPanelGesture} onTouchStart={stopPanelGesture} onTouchMove={stopPanelGesture} onTouchEnd={stopPanelGesture} onTouchCancel={stopPanelGesture} onWheel={stopPanelGesture}><div className="sheet-head"><b>{sheet==='feelings'?c.feel:c.signs}</b><button onClick={()=>setSheet(null)} aria-label="Close">×</button></div>{sheet==='feelings'&&<div className="severity-control"><div className="severity-meta"><span>{lang==='zh'?'疼痛强度':'PAIN INTENSITY'}</span><output>{severity}/10 · {severity<=2?(lang==='zh'?'轻微':'MILD'):severity<=5?(lang==='zh'?'中等':'MODERATE'):severity<=8?(lang==='zh'?'明显':'HIGH'):(lang==='zh'?'剧烈':'SEVERE')}</output></div><input aria-label={lang==='zh'?'疼痛强度':'Pain intensity'} type="range" min="0" max="10" step="1" value={severity} onChange={e=>setSeverity(Number(e.target.value))}/></div>}<div className="sticker-grid">{(sheet==='feelings'?knowledge.feelings:knowledge.signs).map(t=>{const selected=(sheet==='feelings'?feels:signs).includes(t.id);return <button key={t.id} className={selected?'sheet-sticker selected':'sheet-sticker'} onClick={()=>sheet==='feelings'?toggle(feels,setFeels,t.id):toggle(signs,setSigns,t.id)}>{tagLabel(t,lang)}</button>})}</div></div>}{sheet==='diagnosis'&&result&&<div ref={drawerRef} className="sticker-sheet diagnosis-sheet" role="dialog" aria-label={c.result} onPointerDown={stopPanelGesture} onPointerMove={stopPanelGesture} onPointerUp={stopPanelGesture} onPointerCancel={stopPanelGesture} onTouchStart={stopPanelGesture} onTouchMove={stopPanelGesture} onTouchEnd={stopPanelGesture} onTouchCancel={stopPanelGesture} onWheel={stopPanelGesture}><div className="sheet-head"><b>{c.result}</b><button onClick={()=>setSheet(null)} aria-label="Close">×</button></div>{result.error?<p className="error">{result.error}</p>:result.items.length?<div className="cards">{result.items.map((x,i)=><article className="card" key={x.id}><div className="rank">0{i+1}</div><div className="condition">{lang==='zh'?x.name.zh:x.name.en}</div><div className="line"><b>{c.basis}</b> {x.why.map(w=><span key={w}>{parts.includes(w)?bilingualPartText(w,layer):w}</span>)}</div><div className="advice"><b>{c.advice}</b><br/>{lang==='zh'?x.advice.zh:x.advice.en}</div></article>)}</div>:<p className="error">{c.none}</p>}</div>}</section></section></main><Loader/>{booting&&<div className="boot-screen" role="status" aria-live="polite"><div className="boot-brand">{c.slogan}<small>REC // LOCAL</small></div><div className="boot-copy">INITIALIZING ANATOMY // LOCAL</div><div className="boot-bar"><i/></div></div>}</div>}
createRoot(document.getElementById('root')).render(<AppErrorBoundary><App/></AppErrorBoundary>);

