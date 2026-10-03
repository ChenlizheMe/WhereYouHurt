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
// Preload each immutable jsDelivr asset once per page refresh so switching layers
// is instant and never re-downloads a model already in the Three.js cache.
Object.values(MODEL_URLS).forEach(url=>useLoader.preload(GLTFLoader,url,configureGLTF));
const copy={zh:{slogan:'创伤小组',feelAction:'感觉',signsAction:'表现',diagnoseAction:'诊断',view:'查看',layer:'选择图层',parts:'点击疼痛部位',feel:'疼痛感觉',signs:'外部表现',result:'本地参考结果',loading:'加载解剖模型…',none:'请至少选择一个疼痛部位或标签',basis:'判断依据',advice:'日常建议',redFlags:'需要尽快就医的信号',disclaimer:'非专业医疗建议，仅用于日常自我参考，不能替代医生诊断。如有严重或持续症状请及时就医。',disclaimerShort:'医疗提示：仅供参考，严重或持续症状请就医',medication:'非处方药教育信息',medicationIntro:'仅为一般类别说明；请阅读包装标签并咨询药师。这里不提供处方药建议或个体化剂量。',otcPain:'止痛类非处方药（如对乙酰氨基酚或布洛芬）可能用于短期轻微疼痛；按标签使用。',otcTopical:'局部非处方产品（如冷/热敷或外用止痛/止痒产品）可按标签短期使用；破损皮肤勿用外用产品。',medicationWarn:'有肝肾疾病、胃溃疡/出血、正在用药、怀孕/哺乳、对药物过敏或不确定是否适合时，先咨询药师或医生；出现严重反应立即停用并求助。',noPrescription:'不推荐处方药，也不提供个体化用药或剂量。'},en:{slogan:'TraumaSquad',feelAction:'FEEL',signsAction:'SIGNS',diagnoseAction:'DIAGNOSE',view:'VIEW',layer:'LAYERS',parts:'CLICK A PAINFUL AREA',feel:'PAIN FEELINGS',signs:'VISIBLE SIGNS',result:'LOCAL REFERENCE',loading:'Loading anatomy…',none:'Select at least one body area or tag',basis:'Why it matched',advice:'Everyday advice',redFlags:'Seek care promptly for',disclaimer:'Not professional medical advice. For daily self-reference only. Cannot replace a doctor’s diagnosis. Seek medical help if severe or persistent.',disclaimerShort:'Medical note: reference only; seek care for severe or persistent symptoms',medication:'OTC medication education',medicationIntro:'General categories only; read the package label and ask a pharmacist. No prescription recommendations or individualized dosing.',otcPain:'OTC pain-relief categories (such as acetaminophen or ibuprofen) may help short-term minor pain; follow the label.',otcTopical:'OTC topical options (such as cold/heat packs or topical pain/itch products) may be used briefly as labeled; do not use topical products on broken skin.',medicationWarn:'If you have liver/kidney disease, ulcers or bleeding, take other medicines, are pregnant/breastfeeding, have allergies, or are unsure, ask a pharmacist or clinician first; stop and seek help for a serious reaction.',noPrescription:'No prescription medicines or individualized medication/dose recommendations.'}};
const layers=[['skeleton','骨骼','SKELETON'],['muscle','肌肉','MUSCLE'],['nerve','神经','NERVES']];
// GLB nodes use established anatomical English semantics (not stable IDs). Keep the
// visible label human-readable by stripping side/index suffixes and translating the
// semantic terms we encounter in the skeleton/muscle atlases.
const PART_PHRASES=[
  ['abdominal part of pectoralis major muscle','胸大肌腹部'],['clavicular head of pectoralis major muscle','胸大肌锁骨头'],['sternocostal head of pectoralis major muscle','胸大肌胸肋头'],['pectoralis major muscle','胸大肌'],['pectoralis minor muscle','胸小肌'],
  ['gluteus maximus','臀大肌'],['gluteus medius','臀中肌'],['gluteus minimus','臀小肌'],['trapezius muscle','斜方肌'],['deltoid muscle','三角肌'],['biceps brachii muscle','肱二头肌'],['biceps brachii','肱二头肌'],['triceps brachii muscle','肱三头肌'],['triceps brachii','肱三头肌'],['rectus abdominis','腹直肌'],['sternocleidomastoid','胸锁乳突肌'],['tibialis anterior','胫骨前肌'],['gastrocnemius','腓肠肌'],['quadriceps femoris','股四头肌'],['hamstring','腘绳肌'],['calcaneal tendon','跟腱'],['intervertebral disc','椎间盘'],['anterior longitudinal ligament','前纵韧带'],['anterior cruciate ligament','前交叉韧带'],['posterior cruciate ligament','后交叉韧带'],['atlas c1','寰椎（第一颈椎）'],['axis c2','枢椎（第二颈椎）']
];
// These terms are taken from the Anatria GLB node names. The atlas uses side
// suffixes (.l/.r/.ol/.or/.el/.er) and descriptive phrases rather than IDs.
const PART_TERMS={bone:'骨',bones:'骨',muscle:'肌',muscles:'肌',nerve:'神经',nerves:'神经',ligament:'韧带',ligaments:'韧带',longitudinal:'纵向',tendon:'肌腱',tendons:'肌腱',cartilage:'软骨',joint:'关节',joints:'关节',bursa:'滑囊',fascia:'筋膜',sheath:'鞘',retinaculum:'支持带',disc:'椎间盘',intervertebral:'椎间',vertebra:'椎骨',vertebrae:'椎骨',sternum:'胸骨',rib:'肋骨',ribs:'肋骨',costal:'肋',clavicle:'锁骨',scapula:'肩胛骨',femur:'股骨',tibia:'胫骨',fibula:'腓骨',humerus:'肱骨',radius:'桡骨',ulna:'尺骨',patella:'髌骨',calcaneus:'跟骨',talus:'距骨',coccyx:'尾骨',sacrum:'骶骨',skull:'颅骨',ethmoid:'筛骨',frontal:'额骨',parietal:'顶骨',temporal:'颞骨',occipital:'枕骨',mandibular:'下颌',maxillary:'上颌',mandible:'下颌骨',head:'头',neck:'颈',shoulder:'肩',arm:'臂',forearm:'前臂',hand:'手',finger:'指',thumb:'拇指',phalanx:'指骨',metacarpal:'掌骨',metatarsal:'跖骨',chest:'胸',thoracic:'胸',abdominal:'腹',abdomen:'腹',back:'背',spine:'脊柱',lumbar:'腰',pelvic:'骨盆',hip:'髋',thigh:'大腿',leg:'腿',knee:'膝',ankle:'踝',foot:'足',toe:'趾',anterior:'前',posterior:'后',superior:'上',inferior:'下',medial:'内侧',lateral:'外侧',proximal:'近端',distal:'远端',middle:'中部',central:'中央',upper:'上',lower:'下',body:'体',part:'部',branch:'分支',branches:'分支',division:'分部',trunk:'干',process:'突',cells:'细胞',cell:'细胞',flexor:'屈肌',extensor:'伸肌',adductor:'内收肌',abductor:'外展肌',rotator:'旋肌',sulcus:'沟',sulci:'沟',gyrus:'回',gyri:'回',nucleus:'核',plexus:'丛',artery:'动脉',vein:'静脉',canal:'管',tract:'束',cord:'索',root:'根',horn:'角',chamber:'腔',tube:'管',skin:'皮肤',gland:'腺体',nasal:'鼻',molar:'磨牙',tooth:'牙',premolar:'前磨牙',incisor:'门齿',canine:'犬齿',cuneiform:'楔骨',septal:'隔',arytenoid:'杓状软骨',corniculate:'小角软骨',capitate:'头状骨',cuboid:'骰骨',hamate:'钩骨',incus:'砧骨',concha:'鼻甲',lunate:'月骨',lacrimal:'泪骨',malleus:'锤骨',navicular:'舟骨',palatine:'腭骨',pisiform:'豌豆骨',scaphoid:'舟状骨',sesamoid:'籽骨',sinus:'窦',sphenoid:'蝶骨',stapes:'镫骨',trapezium:'大多角骨',trapezoid:'小多角骨',triquetrum:'三角骨',zygomatic:'颧骨',atlas:'寰椎',axis:'枢椎',cricoid:'环状软骨',hyoid:'舌骨',manubrium:'胸骨柄',nuchal:'项',symphysis:'联合',thyroid:'甲状',vomer:'犁骨',xiphoid:'剑突',major:'大',minor:'小',longus:'长肌',brevis:'短肌',longissimus:'最长肌',digitorum:'指',hallucis:'拇趾',pollicis:'拇指',thoracis:'胸',capitis:'头',brachii:'臂',femoris:'股',pectoral:'胸',pectoralis:'胸',serratus:'锯肌',levator:'提肌',costarum:'肋',colli:'颈',scalenus:'斜角肌',fibularis:'腓骨肌',teres:'圆肌',dorsal:'背侧',ulnaris:'尺侧',radialis:'桡侧',superficialis:'浅',profundus:'深',pronator:'旋前肌',depressor:'降肌',orbicularis:'轮匝肌',masseter:'咬肌',temporalis:'颞肌',aponeurosis:'腱膜',intercostal:'肋间肌',gracilis:'薄肌',iliacus:'髂肌',pharyngeal:'咽',constrictor:'缩肌',internus:'内',internal:'内',externus:'外',external:'外',oblique:'斜',transverse:'横',ascending:'升',descending:'降',cutaneous:'皮',brachial:'臂',digital:'指',lobule:'小叶',orbital:'眶',spinal:'脊',sympathetic:'交感',oculomotor:'动眼',cochlear:'耳蜗',peduncle:'脚',trigeminal:'三叉',optic:'视',fasciculus:'束',vermis:'蚓部',ventricle:'脑室',canaliculus:'小管',facial:'面',flocculus:'绒球',geniculate:'膝状',salivatory:'唾液',colliculus:'丘',hypoglossal:'舌下',saphenous:'隐',common:'总',proper:'固有',accessory:'副',c1:'第一颈椎',c2:'第二颈椎',c3:'第三颈椎',c4:'第四颈椎',c5:'第五颈椎',c6:'第六颈椎',c7:'第七颈椎',t1:'第一胸椎',t2:'第二胸椎',t3:'第三胸椎',t4:'第四胸椎',t5:'第五胸椎',t6:'第六胸椎',t7:'第七胸椎',t8:'第八胸椎',t9:'第九胸椎',t10:'第十胸椎',t11:'第十一胸椎',t12:'第十二胸椎',l1:'第一腰椎',l2:'第二腰椎',l3:'第三腰椎',l4:'第四腰椎',l5:'第五腰椎',s1:'第一骶椎',first:'第一',second:'第二',third:'第三',fourth:'第四',fifth:'第五',sixth:'第六',seventh:'第七',eighth:'第八',ninth:'第九',tenth:'第十',eleventh:'第十一',twelfth:'第十二'};
// Curated names for the visible atlas groups. Keys are normalized GLB node names;
// no mesh ID or generated index is ever shown to the user.
const CURATED_PARTS={skeleton:{'atlas c1':{zh:'寰椎',en:'Atlas (C1)'},'axis c2':{zh:'枢椎',en:'Axis (C2)'},'body of sternum':{zh:'胸骨体',en:'Body of sternum'},'manubrium':{zh:'胸骨柄',en:'Manubrium'},'xiphoid process':{zh:'剑突',en:'Xiphoid process'},'clavicle':{zh:'锁骨',en:'Clavicle'},'scapula':{zh:'肩胛骨',en:'Scapula'},'humerus':{zh:'肱骨',en:'Humerus'},'radius':{zh:'桡骨',en:'Radius'},'ulna':{zh:'尺骨',en:'Ulna'},'femur':{zh:'股骨',en:'Femur'},'tibia':{zh:'胫骨',en:'Tibia'},'fibula':{zh:'腓骨',en:'Fibula'},'patella':{zh:'髌骨',en:'Patella'},'calcaneus':{zh:'跟骨',en:'Calcaneus'},'talus':{zh:'距骨',en:'Talus'},'coccyx':{zh:'尾骨',en:'Coccyx'},'sacrum':{zh:'骶骨',en:'Sacrum'},'frontal bone':{zh:'额骨',en:'Frontal bone'},'parietal bone':{zh:'顶骨',en:'Parietal bone'},'temporal bone':{zh:'颞骨',en:'Temporal bone'},'occipital bone':{zh:'枕骨',en:'Occipital bone'},'mandible':{zh:'下颌骨',en:'Mandible'},'maxilla':{zh:'上颌骨',en:'Maxilla'},'nasal bone':{zh:'鼻骨',en:'Nasal bone'},'inferior nasal concha':{zh:'下鼻甲',en:'Inferior nasal concha'},'middle nasal concha':{zh:'中鼻甲',en:'Middle nasal concha'},'superior nasal concha':{zh:'上鼻甲',en:'Superior nasal concha'},'vomer':{zh:'犁骨',en:'Vomer'},'zygomatic bone':{zh:'颧骨',en:'Zygomatic bone'},'palatine bone':{zh:'腭骨',en:'Palatine bone'},'lacrimal bone':{zh:'泪骨',en:'Lacrimal bone'},'sphenoid bone':{zh:'蝶骨',en:'Sphenoid bone'},'ethmoid bone':{zh:'筛骨',en:'Ethmoid bone'},'incisor':{zh:'切牙',en:'Incisor'},'canine':{zh:'尖牙',en:'Canine'},'premolar':{zh:'前磨牙',en:'Premolar'},'molar':{zh:'磨牙',en:'Molar'},'tooth':{zh:'牙',en:'Tooth'},'first rib':{zh:'第一肋骨',en:'First rib'},'second rib':{zh:'第二肋骨',en:'Second rib'},'third rib':{zh:'第三肋骨',en:'Third rib'},'fourth rib':{zh:'第四肋骨',en:'Fourth rib'},'fifth rib':{zh:'第五肋骨',en:'Fifth rib'},'sixth rib':{zh:'第六肋骨',en:'Sixth rib'},'seventh rib':{zh:'第七肋骨',en:'Seventh rib'},'eighth rib':{zh:'第八肋骨',en:'Eighth rib'},'ninth rib':{zh:'第九肋骨',en:'Ninth rib'},'tenth rib':{zh:'第十肋骨',en:'Tenth rib'},'eleventh rib':{zh:'第十一肋骨',en:'Eleventh rib'},'twelfth rib':{zh:'第十二肋骨',en:'Twelfth rib'}},muscle:{'pectoralis major muscle':{zh:'胸大肌',en:'Pectoralis major'},'pectoralis minor muscle':{zh:'胸小肌',en:'Pectoralis minor'},'deltoid muscle':{zh:'三角肌',en:'Deltoid'},'trapezius muscle':{zh:'斜方肌',en:'Trapezius'},'latissimus dorsi muscle':{zh:'背阔肌',en:'Latissimus dorsi'},'biceps brachii muscle':{zh:'肱二头肌',en:'Biceps brachii'},'triceps brachii muscle':{zh:'肱三头肌',en:'Triceps brachii'},'brachialis muscle':{zh:'肱肌',en:'Brachialis'},'brachioradialis muscle':{zh:'肱桡肌',en:'Brachioradialis'},'rectus abdominis muscle':{zh:'腹直肌',en:'Rectus abdominis'},'external oblique muscle':{zh:'腹外斜肌',en:'External oblique'},'internal oblique muscle':{zh:'腹内斜肌',en:'Internal oblique'},'gluteus maximus muscle':{zh:'臀大肌',en:'Gluteus maximus'},'gluteus medius muscle':{zh:'臀中肌',en:'Gluteus medius'},'gluteus minimus muscle':{zh:'臀小肌',en:'Gluteus minimus'},'quadriceps femoris muscle':{zh:'股四头肌',en:'Quadriceps femoris'},'biceps femoris muscle':{zh:'股二头肌',en:'Biceps femoris'},'gastrocnemius muscle':{zh:'腓肠肌',en:'Gastrocnemius'},'soleus muscle':{zh:'比目鱼肌',en:'Soleus'},'tibialis anterior muscle':{zh:'胫骨前肌',en:'Tibialis anterior'},'sartorius muscle':{zh:'缝匠肌',en:'Sartorius'},'adductor longus muscle':{zh:'长收肌',en:'Adductor longus'},'gracilis muscle':{zh:'股薄肌',en:'Gracilis'},'masseter muscle':{zh:'咬肌',en:'Masseter'},'temporalis muscle':{zh:'颞肌',en:'Temporalis'},'orbicularis oculi muscle':{zh:'眼轮匝肌',en:'Orbicularis oculi'},'orbicularis oris muscle':{zh:'口轮匝肌',en:'Orbicularis oris'},'buccinator muscle':{zh:'颊肌',en:'Buccinator'},'nasalis muscle':{zh:'鼻肌',en:'Nasalis'},'procerus muscle':{zh:'鼻骨肌',en:'Procerus'},'frontalis muscle':{zh:'额肌',en:'Frontalis'},'calcaneal tendon':{zh:'跟腱',en:'Calcaneal tendon'}},nerve:{'spinal cord':{zh:'脊髓',en:'Spinal cord'},'sciatic nerve':{zh:'坐骨神经',en:'Sciatic nerve'},'median nerve':{zh:'正中神经',en:'Median nerve'},'ulnar nerve':{zh:'尺神经',en:'Ulnar nerve'},'radial nerve':{zh:'桡神经',en:'Radial nerve'},'femoral nerve':{zh:'股神经',en:'Femoral nerve'},'tibial nerve':{zh:'胫神经',en:'Tibial nerve'},'common fibular nerve':{zh:'腓总神经',en:'Common fibular nerve'},'brachial plexus':{zh:'臂丛',en:'Brachial plexus'},'trigeminal nerve':{zh:'三叉神经',en:'Trigeminal nerve'},'optic nerve':{zh:'视神经',en:'Optic nerve'},'facial nerve':{zh:'面神经',en:'Facial nerve'},'vagus nerve':{zh:'迷走神经',en:'Vagus nerve'},'accessory nerve xi':{zh:'副神经（第十一对）',en:'Accessory nerve (XI)'},'abducens nerve vi':{zh:'展神经（第六对）',en:'Abducens nerve (VI)'},'oculomotor nerve iii':{zh:'动眼神经（第三对）',en:'Oculomotor nerve (III)'},'hypoglossal nerve xii':{zh:'舌下神经（第十二对）',en:'Hypoglossal nerve (XII)'},'olfactory nerve i':{zh:'嗅神经（第一对）',en:'Olfactory nerve (I)'},'glossopharyngeal nerve ix':{zh:'舌咽神经（第九对）',en:'Glossopharyngeal nerve (IX)'},'infraorbital nerve':{zh:'眶下神经',en:'Infraorbital nerve'},'mental nerve':{zh:'颏神经',en:'Mental nerve'},'maxillary nerve':{zh:'上颌神经',en:'Maxillary nerve'},'mandibular nerve':{zh:'下颌神经',en:'Mandibular nerve'},'median nerve with ulnar nerve':{zh:'正中神经与尺神经交通支',en:'Median–ulnar communicating branch'}}};
const UNMAPPED_VISIBLE_PARTS={skeleton:new Set(),muscle:new Set(),nerve:new Set()};
if(import.meta.env.DEV&&typeof window!=='undefined')window.__anatomyUnmapped=UNMAPPED_VISIBLE_PARTS;
function cleanPartName(raw){return String(raw||'').replace(/[._-](?:left|right|l|r|ol|or|el|er|o1l|o1r|e1l|e1r)$/i,'').replace(/\b(?:left|right|ol|or|el|er|l|r)\b/gi,'').replace(/[()]/g,'').replace(/[-/]+/g,' ').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim()}
function partLabel(raw,layer){
  const cleaned=cleanPartName(raw);
  const fallback=layer==='skeleton'?{zh:'人体骨骼',en:'Human skeleton'}:layer==='muscle'?{zh:'人体肌肉',en:'Human musculature'}:{zh:'人体神经',en:'Human nervous system'};
  if(!cleaned||/^general$/i.test(cleaned)||/^mesh/i.test(cleaned)){UNMAPPED_VISIBLE_PARTS[layer]?.add(cleaned||'empty');return fallback;}
  const curated=CURATED_PARTS[layer]?.[cleaned.toLowerCase()];
  if(curated)return curated;
  let zh=cleaned.toLowerCase();
  PART_PHRASES.forEach(([phrase,translation])=>{zh=zh.replace(new RegExp(phrase,'ig'),translation)});
  const tokens=zh.split(' ').filter(token=>!['of','the','and','a'].includes(token));
  const mapped=tokens.map(token=>PART_TERMS[token]||'').filter(Boolean);
  if(!mapped.length){UNMAPPED_VISIBLE_PARTS[layer].add(cleaned);return fallback;}
  zh=mapped.join('').replace(/\s+/g,'').trim();
  return {zh:zh.trim(),en:cleaned};
}
function bilingualPartText(raw,layer,lang='zh'){const label=partLabel(raw,layer);return lang==='zh'?label.zh:label.en}
// The head/face batch uses explicit clinical topics so a model node such as
// “upper molar” can select the dental and nasal knowledge cards without exposing
// its raw mesh name. These are intentionally narrow aliases for this slice.
const PART_TOPIC_ALIASES=[
  ['tooth',['tooth','molar','premolar','incisor','canine','dental']],
  ['nose',['nasal','nose','sinus','concha','turbinate','septum','vomer']],
  ['jaw',['mandible','maxilla','jaw']]
];
function partTopic(raw){const value=cleanPartName(raw).toLowerCase();for(const [topic,tokens] of PART_TOPIC_ALIASES){if(tokens.some(token=>value.includes(token)))return topic}return value}
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
  });},[root,layer,selected]);
  useEffect(()=>()=>{root.traverse(o=>{if(o.isMesh&&o.userData.whereHurtMaterial){o.material.dispose();delete o.userData.whereHurtMaterial;}})},[root]);
  const meshPart=e=>e.object?.userData?.part||e.object?.name||'general';
  const onMeshPointerDown=e=>{e.stopPropagation();clickRef.current={pointerId:e.pointerId,part:meshPart(e),x:e.clientX,y:e.clientY,startedAt:performance.now(),moved:false};};
  const onMeshPointerMove=e=>{const candidate=clickRef.current;if(!candidate||candidate.pointerId!==e.pointerId)return;const distance=Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y);if(distance>6)candidate.moved=true;};
  const onMeshPointerUp=e=>{e.stopPropagation();const candidate=clickRef.current;if(!candidate||candidate.pointerId!==e.pointerId){clickRef.current=null;return;}const elapsed=performance.now()-candidate.startedAt;const distance=Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y);if(!candidate.moved&&elapsed<=420&&distance<=8)onPart(candidate.part);clickRef.current=null;};
  const onMeshPointerCancel=e=>{e.stopPropagation();clickRef.current=null;};
  return <group ref={groupRef}><primitive object={root} onPointerDown={onMeshPointerDown} onPointerMove={onMeshPointerMove} onPointerUp={onMeshPointerUp} onPointerCancel={onMeshPointerCancel}/></group>;
}
class ModelErrorBoundary extends React.Component{state={error:null}; static getDerivedStateFromError(error){return {error};} componentDidUpdate(prev){if(prev.layer!==this.props.layer&&this.state.error)this.setState({error:null});} render(){return this.state.error?<div className="model-error" role="alert">Unable to load the anatomy model. Try another layer or reload the page. {this.state.error?.message||'Unknown loader error'}</div>:this.props.children;}}
class AppErrorBoundary extends React.Component{state={error:null}; static getDerivedStateFromError(error){return {error};} render(){return this.state.error?<main className="app-error" role="alert"><h1>创伤小组</h1><p>The app encountered an unexpected error. Please reload the page.</p><details><summary>Technical details</summary><pre>{String(this.state.error?.message||this.state.error)}</pre></details></main>:this.props.children;}}
function App(){
 const [lang,setLang]=useState('zh'),[layer,setLayer]=useState('skeleton'),[orbit,setOrbit]=useState(0),[elevation,setElevation]=useState(0),[lift,setLift]=useState(0),[zoom,setZoom]=useState(INITIAL_ZOOM),[parts,setParts]=useState([]),[feels,setFeels]=useState([]),[signs,setSigns]=useState([]),[sheet,setSheet]=useState(null),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[booting,setBooting]=useState(true),[severity,setSeverity]=useState(5); const pinchRef=useRef(null); const liftDragRef=useRef(null); const drawerRef=useRef(null); const liftThumbRef=useRef(null); const motionRootRef=useRef(null); const inertiaFrameRef=useRef(null); const orbitVelocityRef=useRef({azimuth:0,elevation:0}); const zoomVelocityRef=useRef(0); const c=copy[lang];
 useEffect(()=>{const timer=setTimeout(()=>setBooting(false),900);return()=>clearTimeout(timer)},[]);
 const chooseLayer=id=>{if(id===layer)return;setParts([]);setLayer(id)};
 useEffect(()=>{if(liftThumbRef.current)gsap.to(liftThumbRef.current,{bottom:`${Math.max(0,Math.min(89.5,((lift+.5)/1.6)*89.5))}%`,duration:.22,ease:'power2.out',overwrite:'auto'});},[lift]);
 useEffect(()=>{const root=motionRootRef.current;if(!root)return;const buttons=[...root.querySelectorAll('button')];const clean=[];buttons.forEach(btn=>{const enter=()=>gsap.to(btn,{y:-2,duration:.18,ease:'power2.out',overwrite:'auto'});const leave=()=>gsap.to(btn,{y:0,duration:.24,ease:'elastic.out(1,.55)',overwrite:'auto'});const down=()=>gsap.to(btn,{scale:.96,duration:.08,ease:'power2.out',overwrite:'auto'});const up=()=>gsap.to(btn,{scale:1,duration:.28,ease:'back.out(2)',overwrite:'auto'});btn.addEventListener('pointerenter',enter);btn.addEventListener('pointerleave',leave);btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);clean.push(()=>{btn.removeEventListener('pointerenter',enter);btn.removeEventListener('pointerleave',leave);btn.removeEventListener('pointerdown',down);btn.removeEventListener('pointerup',up)});});return()=>clean.forEach(fn=>fn())},[sheet,lang]);
 useEffect(()=>{if(sheet&&drawerRef.current)gsap.fromTo(drawerRef.current,{autoAlpha:0,y:24,scale:.96},{autoAlpha:1,y:0,scale:1,duration:.42,ease:'back.out(1.55)',overwrite:'auto'});},[sheet]);
 const toggle=(arr,set,v)=>set(arr.includes(v)?arr.filter(x=>x!==v):[...arr,v]);
 const displayWhy=w=>{if(parts.includes(w))return bilingualPartText(w,layer,lang);const tag=[...knowledge.feelings,...knowledge.signs].find(item=>item.id===w);return tag?tagLabel(tag,lang):w};
 const run=()=>{if(!parts.length&&!feels.length&&!signs.length){setResult({error:c.none});setSheet('diagnosis');return}setBusy(true);setSheet('diagnosis');setTimeout(()=>{const scored=knowledge.conditions.map(x=>{let score=0,why=[];for(const p of parts){const topic=partTopic(p);if(x.parts.includes(topic)||x.parts.includes(p)){score+=3;why.push(p)}}for(const f of feels){if(x.feelings.includes(f)){score+=2;why.push(f)}}for(const z of signs){if(x.signs.includes(z)){score+=2;why.push(z)}}return {...x,score,why:[...new Set(why)]}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);setResult({items:scored});setBusy(false)},320)};
 const dragRef=useRef(null);
 const cancelInertia=()=>{if(inertiaFrameRef.current!==null){cancelAnimationFrame(inertiaFrameRef.current);inertiaFrameRef.current=null}orbitVelocityRef.current={azimuth:0,elevation:0};zoomVelocityRef.current=0};
 const startInertia=()=>{if(inertiaFrameRef.current!==null)return;const tick=()=>{let active=false;const orbitV=orbitVelocityRef.current;const zoomV=zoomVelocityRef.current;if(Math.abs(orbitV.azimuth)>.002||Math.abs(orbitV.elevation)>.002){setOrbit(v=>v+orbitV.azimuth);setElevation(v=>Math.max(-38,Math.min(38,v+orbitV.elevation)));orbitV.azimuth*=.9;orbitV.elevation*=.9;active=true}else{orbitV.azimuth=0;orbitV.elevation=0}if(Math.abs(zoomV)>.001){setZoom(v=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,v+zoomV)));zoomVelocityRef.current=zoomV*.84;active=true}else zoomVelocityRef.current=0;if(active)inertiaFrameRef.current=requestAnimationFrame(tick);else inertiaFrameRef.current=null};inertiaFrameRef.current=requestAnimationFrame(tick)};
 useEffect(()=>()=>cancelInertia(),[]);
 const isViewerControlTarget=target=>target?.closest?.('button,input,summary,details,.sticker-sheet,.medical-note,.vertical-control');
 const closeSheetFromOutside=target=>{if(!sheet)return;const insideDock=target?.closest?.('.sticker-dock');const insideSheet=target?.closest?.('.sticker-sheet');if(!insideDock&&!insideSheet)setSheet(null)};
 const onViewerWheel=e=>{if(isViewerControlTarget(e.target))return;const rawDelta=e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*window.innerHeight:e.deltaY;if(!Number.isFinite(rawDelta)||rawDelta===0)return;e.preventDefault();cancelInertia();const impulse=-rawDelta*.00125;zoomVelocityRef.current=Math.max(-1.2,Math.min(1.2,zoomVelocityRef.current+impulse*.42));setZoom(z=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,z*Math.exp(impulse))));startInertia()};
 const onViewerPointerDown=e=>{closeSheetFromOutside(e.target);cancelInertia();if(e.pointerType!=='mouse'||e.button!==0||isViewerControlTarget(e.target))return;dragRef.current={id:e.pointerId,x:e.clientX,y:e.clientY,vOrbit:0,vElevation:0};e.currentTarget.setPointerCapture?.(e.pointerId)};
 const onViewerPointerMove=e=>{const d=dragRef.current;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;d.x=e.clientX;d.y=e.clientY;d.vOrbit=d.vOrbit*.25-dx*.45*.75;d.vElevation=d.vElevation*.25+dy*.35*.75;setOrbit(v=>v-dx*.45);setElevation(v=>Math.max(-38,Math.min(38,v+dy*.35)))};
 const onViewerPointerEnd=e=>{const d=dragRef.current;if(!d||d.id!==e.pointerId)return;dragRef.current=null;if(e.type!=='pointercancel'){orbitVelocityRef.current={azimuth:d.vOrbit,elevation:d.vElevation};startInertia()}};
 const onViewerTouchStart=e=>{closeSheetFromOutside(e.target);cancelInertia();if(isViewerControlTarget(e.target))return;if(e.touches.length===2){dragRef.current=null;const [a,b]=e.touches;pinchRef.current=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);return}if(e.touches.length===1&&!isViewerControlTarget(e.target))dragRef.current={id:'touch',x:e.touches[0].clientX,y:e.touches[0].clientY,vOrbit:0,vElevation:0}};
 const onViewerTouchMove=e=>{if(isViewerControlTarget(e.target))return;if(e.touches.length===2&&pinchRef.current){e.preventDefault();const [a,b]=e.touches;const distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);const delta=pinchRef.current-distance;zoomVelocityRef.current=Math.max(-1.2,Math.min(1.2,zoomVelocityRef.current-delta*.02));setZoom(z=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,z-delta*.04)));pinchRef.current=distance;return}if(e.touches.length===1&&dragRef.current?.id==='touch'){e.preventDefault();const dx=e.touches[0].clientX-dragRef.current.x,dy=e.touches[0].clientY-dragRef.current.y;dragRef.current.x=e.touches[0].clientX;dragRef.current.y=e.touches[0].clientY;dragRef.current.vOrbit=dragRef.current.vOrbit*.25-dx*.45*.75;dragRef.current.vElevation=dragRef.current.vElevation*.25+dy*.35*.75;setOrbit(v=>v-dx*.45);setElevation(v=>Math.max(-38,Math.min(38,v+dy*.35)))} };
 const onViewerTouchEnd=e=>{if(e.touches.length<2)pinchRef.current=null;if(e.touches.length===0){if(dragRef.current){const d=dragRef.current;dragRef.current=null;orbitVelocityRef.current={azimuth:d.vOrbit,elevation:d.vElevation}}startInertia()}};
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
 const resetView=()=>{cancelInertia();setOrbit(0);setElevation(0);setLift(0);setZoom(INITIAL_ZOOM);setLayer('skeleton');setParts([]);setSheet(null)};
 return <div ref={motionRootRef} className="app"><main><section className="console single-view"><section className="viewer" aria-label="Interactive 3D anatomy model" onPointerDown={onViewerPointerDown} onPointerMove={onViewerPointerMove} onPointerUp={onViewerPointerEnd} onPointerCancel={onViewerPointerEnd} onTouchStart={onViewerTouchStart} onTouchMove={onViewerTouchMove} onTouchEnd={onViewerTouchEnd} onWheel={onViewerWheel}><div className="screen-label"><strong>{c.slogan}</strong><span className="screen-status">{lang==='zh'?'解剖 // 实时':'ANATOMY // LIVE'}</span><span className="led"/></div><div className="scene-tools"><div className="scene-controls"><button aria-label="Switch language" onClick={()=>setLang(lang==='zh'?'en':'zh')}>{lang==='zh'?'EN':'中'}</button><button className="reset-control" aria-label="Reset view" onClick={resetView}>RESET</button></div><div className="model-layers" aria-label="Anatomy layer picker">{layers.map(([id,zh,icon])=><button key={id} aria-label={lang==='zh'?zh:icon} className={layer===id?'layer-dot active':'layer-dot'} onClick={()=>chooseLayer(id)}><span className="layer-icon">{id==='skeleton'?'▦':id==='muscle'?'◉':'⌁'}</span><span className="layer-name">{lang==='zh'?zh:icon}</span></button>)}</div>{parts.length>0&&<div className="part-selection" aria-live="polite" aria-label={lang==='zh'?'已选解剖结构':'Selected anatomy structure'}><b>{lang==='zh'?partLabel(parts[0],layer).zh:partLabel(parts[0],layer).en}</b></div>}</div><div className="crt-overlay" aria-hidden="true"><span className="crt-noise"/><span className="crt-scanlines"/><span className="crt-vignette"/><span className="crt-chroma"/><span className="crt-grain"/><div className="particles">{Array.from({length:8},(_,i)=><i key={i} style={{'--i':i}}/>)}</div></div><ModelErrorBoundary layer={layer}><Canvas className="anatomy-canvas" fallback={<div className="model-error" role="alert">3D preview is unavailable in this browser.</div>} camera={{position:[0,0,3.8],fov:38}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.NoToneMapping;gl.shadowMap.enabled=false;}} dpr={[1,1.5]}><color attach="background" args={['#171916']}/><ambientLight intensity={1.5}/><directionalLight position={[2,3,4]} intensity={2}/><Suspense fallback={<Html center className="model-loading">{c.loading}</Html>}><Model layer={layer} onPart={p=>setParts(prev=>prev[0]===p?[]:[p])} selected={parts}/></Suspense><CameraRig orbit={orbit} lift={lift} elevation={elevation} zoom={zoom}/></Canvas></ModelErrorBoundary><div className="vertical-control" onTouchStart={stopPanelGesture} onTouchMove={stopPanelGesture} onTouchEnd={stopPanelGesture} onWheel={stopPanelGesture}><div className="vertical-track" role="slider" tabIndex={0} aria-label={lang==='zh'?'摄像机上下平移':'Vertical camera translation'} aria-orientation="vertical" aria-valuemin={-.5} aria-valuemax={1.1} aria-valuenow={Number(lift.toFixed(2))} title={lang==='zh'?'按住后上下拖动':'Press and drag vertically'} onPointerDown={onLiftPointerDown} onPointerMove={onLiftPointerMove} onPointerUp={onLiftPointerEnd} onPointerCancel={onLiftPointerEnd} onLostPointerCapture={onLiftPointerEnd} onKeyDown={onLiftKeyDown} onClick={e=>{e.preventDefault();e.stopPropagation()}}><span ref={liftThumbRef} className="lift-thumb" aria-hidden="true" style={{bottom:`${Math.max(0,Math.min(89.5,((lift+.5)/1.6)*89.5))}%`}}/></div></div><div className="sticker-dock" aria-label="Quick actions"><button className={sheet==='feelings'?'sticker-card active':'sticker-card'} onClick={()=>setSheet('feelings')}>{c.feelAction} <span>{feels.length||'+'}</span></button><button className={sheet==='signs'?'sticker-card active':'sticker-card'} onClick={()=>setSheet('signs')}>{c.signsAction} <span>{signs.length||'+'}</span></button><button className={sheet==='diagnosis'?'sticker-card active diagnosis':'sticker-card diagnosis'} onClick={run}>{busy?'…':c.diagnoseAction} <span>↗</span></button></div><details className="medical-note"><summary>⚠ {c.disclaimerShort}</summary><div>{c.disclaimer}</div></details>{sheet&&sheet!=='diagnosis'&&<div ref={drawerRef} className="sticker-sheet" role="dialog" aria-label={sheet==='feelings'?c.feel:c.signs} onPointerDown={stopPanelGesture} onPointerMove={stopPanelGesture} onPointerUp={stopPanelGesture} onPointerCancel={stopPanelGesture} onTouchStart={stopPanelGesture} onTouchMove={stopPanelGesture} onTouchEnd={stopPanelGesture} onTouchCancel={stopPanelGesture} onWheel={stopPanelGesture}><div className="sheet-head"><b>{sheet==='feelings'?c.feel:c.signs}</b><button onClick={()=>setSheet(null)} aria-label="Close">×</button></div>{sheet==='feelings'&&<div className="severity-control"><div className="severity-meta"><span>{lang==='zh'?'疼痛强度':'PAIN INTENSITY'}</span><output>{severity}/10 · {severity<=2?(lang==='zh'?'轻微':'MILD'):severity<=5?(lang==='zh'?'中等':'MODERATE'):severity<=8?(lang==='zh'?'明显':'HIGH'):(lang==='zh'?'剧烈':'SEVERE')}</output></div><input aria-label={lang==='zh'?'疼痛强度':'Pain intensity'} type="range" min="0" max="10" step="1" value={severity} onChange={e=>setSeverity(Number(e.target.value))}/></div>}<div className="sticker-grid">{(sheet==='feelings'?knowledge.feelings:knowledge.signs).map(t=>{const selected=(sheet==='feelings'?feels:signs).includes(t.id);return <button key={t.id} className={selected?'sheet-sticker selected':'sheet-sticker'} onClick={()=>sheet==='feelings'?toggle(feels,setFeels,t.id):toggle(signs,setSigns,t.id)}>{tagLabel(t,lang)}</button>})}</div></div>}{sheet==='diagnosis'&&result&&<div ref={drawerRef} className="sticker-sheet diagnosis-sheet" role="dialog" aria-label={c.result} onPointerDown={stopPanelGesture} onPointerMove={stopPanelGesture} onPointerUp={stopPanelGesture} onPointerCancel={stopPanelGesture} onTouchStart={stopPanelGesture} onTouchMove={stopPanelGesture} onTouchEnd={stopPanelGesture} onTouchCancel={stopPanelGesture} onWheel={stopPanelGesture}><div className="sheet-head"><b>{c.result}</b><button onClick={()=>setSheet(null)} aria-label="Close">×</button></div>{result.error?<p className="error">{result.error}</p>:result.items.length?<div className="cards">{result.items.map((x,i)=><article className="card" key={x.id}><div className="rank">0{i+1}</div><div className="condition">{lang==='zh'?x.name.zh:x.name.en}</div>{(x.summary||x.summaryEn)&&<p className="condition-summary">{lang==='zh'?x.summary:x.summaryEn}</p>}<div className="line"><b>{c.basis}</b> {x.why.map(w=><span key={w}>{displayWhy(w)}</span>)}</div><div className="advice"><b>{c.advice}</b><br/>{lang==='zh'?x.advice.zh:x.advice.en}</div>{x.redFlags&&<div className="red-flags"><b>{c.redFlags}</b><br/>{lang==='zh'?x.redFlags.zh:x.redFlags.en}</div>}</article>)}</div>:<p className="error">{c.none}</p>}</div>}</section></section></main><Loader/>{booting&&<div className="boot-screen" role="status" aria-live="polite"><div className="boot-brand">{c.slogan}</div><div className="boot-copy">{lang==='zh'?'正在载入解剖模型 // 本地':'INITIALIZING ANATOMY // LOCAL'}</div><div className="boot-bar"><i/></div></div>}</div>}
createRoot(document.getElementById('root')).render(<AppErrorBoundary><App/></AppErrorBoundary>);
