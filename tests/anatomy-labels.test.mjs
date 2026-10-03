import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PropertyBinding} from 'three';
import {partLabel,anatomyIdentity,safePartLabel} from '../src/anatomyLabels.js';
for (const [layer,file] of Object.entries({skeleton:'skeletal',muscle:'muscular',nerve:'nervous'})) {
 test(`${layer}: every GLB mesh, loader name and entity-encoded variant has a bilingual label`,()=>{
  const b=fs.readFileSync(new URL(`../public/anatomy/${file}_male.glb`,import.meta.url));
  const doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  const nodes=doc.nodes.filter(n=>n.mesh!==undefined);assert.ok(nodes.length>300);
  for(const n of nodes){
   const original=partLabel(n.name,layer);
   for(const name of [n.name,PropertyBinding.sanitizeNodeName(n.name),PropertyBinding.sanitizeNodeName(n.name)+'&amp;#x20;']){
    const label=partLabel(name,layer);
    assert.ok(!/[a-z]{2}|人体骨骼|人体肌肉|人体神经|&#/i.test(label.zh),`${name}: ${label.zh}`);
    assert.ok(label.en,`${name}: empty English label`);
    assert.notEqual(label.zh,'人体骨骼',`${name}: generic skeleton placeholder`);
    assert.notEqual(label.zh,'人体肌肉',`${name}: generic muscle placeholder`);
    assert.notEqual(label.zh,'人体神经',`${name}: generic nerve placeholder`);
   }
  }
 });
}
test('reported palpebral name and natural terminal letters',()=>{
 assert.equal(partLabel('Palpebral part of orbicularis oculil&amp;#x20;','muscle').zh,'左侧眼轮匝肌睑部');
 for(const name of ['Obturator internus','Adductor longus','Orbicularis oris muscle'])assert.equal(anatomyIdentity(name).side,'');
 assert.doesNotThrow(()=>partLabel('&#99999999999999;','muscle'));
 const safe=safePartLabel('Palpebral part of orbicularis oculil&amp;#x20;','muscle');
 assert.equal(safe.zh,'左侧眼轮匝肌睑部');
 assert.equal(partLabel('Palpebral part of orbicularis oculil&#x20; &#x63;anvas','muscle').zh,'左侧眼轮匝肌睑部');
 assert.equal(safePartLabel('Unreviewed atlas node &#x20; canvas','muscle').zh,'待核验肌肉结构');
 assert.equal(safePartLabel('Unreviewed atlas node &#x20;','muscle').zh,'待核验肌肉结构');
});
