import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clinicalProfile} from '../src/clinicalRegions.js';

test('runtime atlas names resolve to a clinical region',()=>{
  for(const [layer,file] of Object.entries({skeleton:'skeletal',muscle:'muscular',nerve:'nervous'})){
    const b=fs.readFileSync(new URL(`../public/anatomy/${file}_male.glb`,import.meta.url));
    const doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
    for(const node of doc.nodes.filter(n=>n.mesh!==undefined)){
      const profile=clinicalProfile(node.name,layer);
      assert.notEqual(profile.region,'general',`${layer}: ${node.name}`);
      assert.ok(profile.title.zh&&!/[A-Za-z]{2,}/.test(profile.title.zh),`${layer}: ${node.name} -> ${profile.title.zh}`);
    }
  }
});

test('entity-encoded palpebral and laterality survive clinical profiling',()=>{
  const eye=clinicalProfile('Palpebral part of orbicularis oculil&amp;#x20;','muscle');
  assert.equal(eye.region,'eye');
  assert.equal(eye.side,'left');
  assert.equal(eye.label.zh,'左侧眼轮匝肌睑部');
  const abdomen=clinicalProfile('Rectus abdominis muscle.r','muscle');
  assert.equal(abdomen.region,'abdomen');
  assert.equal(abdomen.side,'right');
  assert.equal(abdomen.title.zh,'右侧腹壁及腹腔');
});
