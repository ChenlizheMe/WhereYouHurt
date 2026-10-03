import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessSymptoms} from '../src/clinicalEngine.js';

const knowledge=JSON.parse(fs.readFileSync(new URL('../data/knowledge.json',import.meta.url),'utf8'));
const selectableTags=new Set([...knowledge.feelings,...knowledge.signs].map(tag=>tag.id));

test('every differential uses a selectable symptom tag',()=>{
 for(const condition of knowledge.conditions){
  for(const tag of [...condition.feelings,...condition.signs]){
   assert.ok(selectableTags.has(tag),`${condition.id} references missing selector tag: ${tag}`);
  }
 }
});

test('dental symptoms rank a concrete dental differential',()=>{
 const result=assessSymptoms(knowledge,{parts:['Upper first molar tooth.r'],layer:'skeleton',feelings:['冷热敏感','夜间痛'],signs:['牙龋洞']});
 assert.equal(result.items[0].id,'dental-caries');
 assert.match(result.items[0].summary,/龋|牙本质/);
});

test('abdominal quadrant filters the opposite visceral side',()=>{
 const result=assessSymptoms(knowledge,{parts:['Rectus abdominis muscle.r'],layer:'muscle',feelings:['绞痛'],signs:['发热'],location:'rlq',severity:7});
 assert.ok(result.items.some(item=>item.id==='appendicitis-pattern'));
 assert.ok(!result.items.some(item=>item.id==='diverticular-left-abdominal'));
 assert.ok(result.urgent.length>0);
});

test('severe abdominal red flags stay visible above the cards',()=>{
 const result=assessSymptoms(knowledge,{parts:['Rectus abdominis muscle.l'],layer:'muscle',feelings:['钝痛'],signs:['呕血'],location:'epigastric',severity:9});
 assert.ok(result.urgent.length>0);
});

test('new region routes return concrete differentials',()=>{
 const cases=[
  ['Hyoid bone','skeleton','pharyngitis'],
  ['Clavicle.l','skeleton','bone-injury'],
  ['Coccygeus muscle.l','muscle','pelvic-pain'],
  ['Sympathetic trunk','nerve','autonomic-assessment']
 ];
 for(const [part,layer,id] of cases){
  const result=assessSymptoms(knowledge,{parts:[part],layer,feelings:['钝痛'],signs:['发热']});
  assert.ok(result.items.some(item=>item.id===id),`${part} did not route to ${id}`);
 }
});
