import {anatomyIdentity,safePartLabel} from './anatomyLabels.js';

// The muscle view uses the existing mixed nervous-system asset. Its neural
// nodes are filtered by anatomical identity before rendering or picking.
export const ANATOMY_MODELS = {
 skeleton: {file:'skeletal_male.glb',zh:'骨骼',en:'SKELETON'},
 muscle: {file:'nervous_male.glb',zh:'肌肉',en:'MUSCLE'}
};

export function isVisibleAnatomyMesh(raw,layer){
 if(layer==='skeleton')return true;
 if(layer!=='muscle')return false;
 const text=`${safePartLabel(raw,layer).zh} ${anatomyIdentity(raw).name}`;
 // Do not fall back to the layer name for ambiguous nodes such as cauda
 // equina or corpus callosum; a muscle view must contain actual musculature.
 return !/神经|nerve/i.test(text)&&/肌|腱|筋膜|muscle|tendon|fascia|aponeurosis/i.test(text);
}
